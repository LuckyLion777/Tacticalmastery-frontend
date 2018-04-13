# tacticalmastery-frontend
Frontend code for the TacticalMastery site.

## Building instructions

Install all of the needed dependencies via `npm install` and `npm run install-server` while in the project directory, and build the **production ready build** (minifed and decommented) with the command `npm run build`. The **development build**, which builds faster because it skips minification and comment striping is done with the command `npm run dbuild`.

The compiled website should then be available in the `build` directory.

To run the server while in dev, use `npm run server` from the root project directory. For production, start the server from the build directory.

Production builds will transpile `server.js` as well as all `node_modules` located in the `build/` directory via Babel..

To manage packages for the front-end server, cd into the `src/server` directory.

## Zipcodes
The implemented zipcodes package requires the database to be manually populated when newly installed. This can be done by entering into `src/server/node_module/zipcodes` and building with `make codes`. As of the current revision of this README, the populated files should be in `lib/`. **Without these files, the autofill api will not function at all and may cause undefined behaviors**