/**
 * Created by flynn on 12/07/17.
 */

var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var gulp = require('gulp');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var cleanCSS = require('gulp-clean-css');
var concatCSS = require('gulp-concat-css');
var concatJS = require('gulp-concat');
var fileUrlInjection = require('gulp-inject');
var strip = require('gulp-strip-comments');
var babel = require('gulp-babel');
var gulpIf = require('gulp-if');
var replace = require('gulp-replace');
var del = require('del');
var shell = require('gulp-shell');
var run = require('gulp-run');
var watch = require('gulp-watch');
var uglifycss = require('uglifycss');

var publicRoot = 'build/public/';
var assetsRoot = publicRoot + 'assets/';

var CSS_PRELOAD_FLAG = '<!-- %CSP_PRELOAD_CSS% -->';
var CSS_PRELOAD_CONFIG_FLAG = '/%INJECT_PRELOAD_CSS_SHA%/';

var ENV_DEV, ENV_PROD;

// clears build directory before building
gulp.task('clean', ()=> {
    return del('build');
});

// copies fonts into assets directory
gulp.task('copyFonts', ()=> {
    return gulp.src('src/fonts/**/*')
        .pipe(gulp.dest(assetsRoot + '/fonts'));
});

// copies images into assets directory
gulp.task('copyImages', ()=> {
   return gulp.src('src/images/**/*')
       .pipe(gulp.dest(assetsRoot +  'img'));
});

// copies and transpiles server to Es2015 compliant code
gulp.task('copyServer', ()=> {
    // copy AWS config files
    gulp.src('.ebextensions/*')
        .pipe(gulp.dest('build/.ebextensions'));
    gulp.src('src/*.txt')
        .pipe(gulp.dest('build/public'));

    // copy non-js assets
    gulp.src('src/server/**/!(*-lock.json|*.js)')
        .pipe(gulp.dest('build/'));

    // copy and transpile js assets
    return gulp.src(['src/server/**/*.js']) // ignore zipcodes/lib since it's mostly db and es5
        .pipe(gulpIf(ENV_PROD, babel({ // only run babel for production builds
            ignore: ['src/server/node_modules/zipcodes/lib/*.js'],
            presets: ['es2015'],
            compact: false
        })))
        .pipe(gulp.dest('build/'));
});

gulp.task('buildJS', ['clean'], () => {
    /* Setup macro functions for reducing redundant code
     Right now, because there is little code shared between pages the `front` and
     `checkout` files are not concatenated. Only the needed JS files will be loaded.
     */
    var globalIncludes; // array containing paths of scripts that should be included in all fbuild iles

    var processJS = (jsFilePath, jsIncludePaths) => {
        if (typeof jsIncludePaths !== "object") jsIncludePaths = []; // set to empty array if not set as object

        // pre-add (concat) all of the globalIncludes
        jsIncludePaths = globalIncludes.concat(jsIncludePaths);
        console.log(jsIncludePaths.concat([jsFilePath]))

        return gulp.src(jsIncludePaths.concat([jsFilePath]))
            .pipe(concatJS(path.basename(jsFilePath))) // generates name based on the filename provided
            .pipe(gulpIf(ENV_PROD, uglify())) // only minify if not in development
            .pipe(rename({ suffix: '.min' }))
            .pipe(gulp.dest(assetsRoot + 'js'));
        /* This might need to be modified to allow more specific resource concatenation, right now it's
         * not really needed to be implemented, since very few js resources are being shared between pages
         */
    }

    // set the names of the globally included scripts
    globalIncludes = [];

    // Process Javascript files and place them into the build/assets/js directory



    processJS('src/js/promo.js', ['src/js/api.js']);
    processJS('src/js/receipt.js', ['src/js/api.js']);
    processJS('src/js/front.js', ['src/js/api.js', 'src/js/tm.validator.js','src/js/modal.js', 'src/js/purifier.js']);
    processJS('src/js/front-wistia.js'); // no includes for the post front page (after wistia)
    return processJS('src/js/checkout.js', ['src/js/api.js', 'src/js/tm.validator.js']); // force a wait
});

gulp.task('buildCSS', ['clean'], () =>{
    /*
     * The below macro function combines the `global` css file with the file that is
     * given in the cssFilePath argument. The output name of the generated file is
     * based on the name of the input file
     * */
    var generateCSS = (cssFilePath) => {
        return gulp.src(['src/styles/global.css', `src/styles/${ cssFilePath }`])
            .pipe(concatCSS(path.basename(cssFilePath))) // generates name based on the filename provided
            .pipe(gulpIf(ENV_PROD, cleanCSS()))  // only minify if not in development
            .pipe(rename({ suffix: '.min' }))
            .pipe(gulp.dest(assetsRoot + 'styles'));
    }

    // Process CSS files and place them inside of the build/assets/css directory
    generateCSS('front.css');
    generateCSS('promotional.css');
    generateCSS('receipt.css');
    return generateCSS('checkout.css');
});

gulp.task('buildHTML', ['clean', 'buildCSS', 'buildJS'], () => {
    // small macro function for injecting an HTML file into another via piping
    var injectHTMLTemplate = (sourceFilePath) =>{
        return fileUrlInjection(gulp.src(sourceFilePath),{
            // gets filename (without ext) from sourceFile
            starttag: `<!-- inject:${ path.basename(sourceFilePath, path.extname(sourceFilePath)) }:{{ext}} -->`,
            transform: (filePath, file) => {
                // return file contents as string
                return file.contents.toString('utf8')
            }})
    };

    /* The below function takes the dynamically rendered CSS/JS files and injects
     * their file paths directly into the HTML document. The inputHTMLFileName is the name
     * of the HTML file, relative to the `src/pages` directory, the sourceArray contains
     * an array of filenames that are files to be included in the output HTML file, and
     * outputBuildHTML<style>body{display:none}</style>Path is the output filename relative to the `build` directory */

    var injectMainPageHTMLSources = (inputHTMLFileName, outputBuildHTMLPath) => {
        return gulp.src(`src/pages/${ inputHTMLFileName }`)
             // inject common modal html into page
            .pipe(injectHTMLTemplate('src/common/modals.html')) // inject common modals
            .pipe(injectHTMLTemplate('src/common/footer.html')) // inject page footer
            .pipe(rename(outputBuildHTMLPath))
            .pipe(gulp.dest(publicRoot));
    }

    /* The below function takes the productId of the item and finds it inside of the `src/promotional` directory,
     * and injects into the template for promotional items found in `src/pages/promotional.html`. */

    var injectPromoHTML = (productId) => {
        productId = productId.trim();
        return gulp.src('src/pages/promotional.html')
            .pipe(fileUrlInjection(gulp.src(`src/promotional/${ productId }.html`),{
                // gets filename (without ext) from sourceFile
                starttag: '<!-- inject:promotional-item -->',
                transform: (filePath, file) => {
                    // return file contents as string
                    return file.contents.toString('utf8')
                }}))
            .pipe(rename(`${ productId }.html`))
            .pipe(gulp.dest(`${ publicRoot }/promo/`));
    }

    // setup promotional pages for after checkout viewing
    injectPromoHTML('battery');
    injectPromoHTML('headlamp');

    // copy the static receipt page to checkout
    gulp.src('src/pages/receipt.html')
        .pipe(gulp.dest(`${ publicRoot }/checkout/`));

    // setup HTML injection for main pages
    injectMainPageHTMLSources('front.html', 'index.html');
    return injectMainPageHTMLSources('checkout.html', 'checkout/index.html');
});

gulp.task('inject_front_preload', ['copyServer'], () => {
    // task to be run after server assets are copied to build. SHA hashes and allows inline-CSS to run while in CSP

    var originalCSS = fs.readFileSync(path.join(__dirname, '/src/styles/preload-front.css')).toString('utf8');

    // replace any bloat characters (line breaks, returns, ect)
    var minifiedCSS = uglifycss.processString(originalCSS);

    // generate base64 sha256 hash for the CSP to handle
    // var cssSHA = sha256.update(minifiedStyleTag.trim(), 'utf8').digest('base64');

    var cssSHA = crypto.createHash('sha256').update(minifiedCSS, 'utf8').digest('base64');

    console.log(minifiedCSS);
    console.log(cssSHA);

    // create sri has of function
    /*return sri.hash('/path/to/my/file.js', function(err, hash){
     if (err) throw err*/


    gulp.src('build/public/index.html', {base: './'})
        // inject the generated tag to the front stylesheet
        .pipe(replace(CSS_PRELOAD_FLAG, '<style>' + minifiedCSS + '</style>' || ''))
        .pipe(gulp.dest('./'));

    return gulp.src('build/server.js', {base: './'})
        .pipe(replace(CSS_PRELOAD_CONFIG_FLAG, (cssSHA) ? `\"'sha256-${ cssSHA }'\"`.toString('utf8') : ''))
        .pipe(gulp.dest('./'));



});

gulp.task('set_env_development', () =>{
    ENV_DEV = true;
    ENV_PROD = false;
});

gulp.task('set_env_production', () => {
    ENV_DEV = false;
    ENV_PROD = true;
});


gulp.task('dbuild', ['set_env_development', 'buildHTML'], () => {
    gulp.start('copyImages');
    gulp.start('copyFonts');
    gulp.start('inject_front_preload');
});

gulp.task('build', ['set_env_production', 'buildHTML'], () => {
    gulp.start('copyImages');
    gulp.start('copyFonts');
    gulp.start('inject_front_preload');
});


gulp.task('watch', () =>{
    watch('src/**/*', () =>{
        // run node sever after development build
        gulp.start('dbuild');
    });
});
