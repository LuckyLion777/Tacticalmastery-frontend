/**
 * Created by flynn on 13/07/17.
 */

/* In this project, modals will be strictly speaking, only activated by a global click handler which detects which
* part of the screen is being clicked (via e.target), and detecting wheteher it has a data role of 'modal' */

(function(window, document) {
    var bodyClass = document.body.classList,
        bodyStyle = document.body.style,
        subModalId = 'offer', // id value of the subscription modal
        activeModal = null; // reference to the currently active Modal

    function getModalId(elem){
        // this function searches for a modalId by going to each parent (maximum of three ancestors) and
        // checking if a modalId is present

        var i = 3,// the number of layers that are searched (should be relatively short, since this happens each click)
            elemNode = elem;

        while (elemNode){
            // auto exit loop if elem is undefined
            if (typeof elemNode.dataset === "object" && typeof elemNode.dataset.modalId === "string") {
                // the dataset was found, return it's value
                return elemNode.dataset.modalId;
            }

            elemNode = elemNode.parentNode; // iterate to next layer

            if (--i <= 0) return null; // there isn't a modalId that was triggered.
        }
        return null; // the while loop hit the top parent of the DOM tree
    }

    function closeActiveModal(){
        bodyClass.add('fade-out');
        bodyClass.remove('fade');

        if (window.location.hash === '#' + subModalId){
            window.location.hash = ''; // remove hash after closing
        }

        // wait for animation to complete
        setTimeout(function(){
            // set scrollbar fix
            bodyStyle.overflowY = 'auto';
            // wait for remaining animation to complete
            setTimeout(function(){
                activeModal.classList.remove('show');
                bodyClass.remove('modal', 'fade-out');

                bodyStyle.overflowY = '';

                activeModal = null; // set activeModal to null
            }, 100);
        }, 125);
    }

    function openModal(modalElement){
        if (typeof modalElement === "object") {
            // the modal exists
            bodyClass.add('modal'); // trickle down an overlay fade
            modalElement.classList.add('show'); // trigger a css animation to fade the modal in

            setTimeout(function () {
                bodyClass.add('fade');
            }, 100); // wait 10 milliseconds and then start the fade animation

            // check to see if the modal is the subscription modal
            if (modalElement.id === subModalId){
                window.location.hash = subModalId;
            }
            activeModal = modalElement;
        }
    }

    function clickEvent(e) {
        var target = e.target;

        if (activeModal){
            // a modal is currently active, check to see if we can close it
            if (target === activeModal.parentNode || target.parentNode === activeModal.parentNode ){
                // the dark fade area was clicked, proceed to fade out
                closeActiveModal();
            }
        } else {
            // there isn't a modal currently active

            var modalId;
            if (modalId = getModalId(target)) {
                // at this point, we assume that the element that was clicked corresponds to a valid modal element on the page
                // check to make sure it exists

                var modalElement = document.getElementById(modalId);

                if (modalElement){
                    // the element exists and can be opened
                    openModal(document.getElementById(modalId)); // open modal if it exists
                } else {
                    console.error('MODAL: the requested modal with id: (#' + modalId + ') cannot be found.');
                }

            }
        }
    }

    window.addEventListener('click', clickEvent);
    window.addEventListener('touchend', clickEvent);

    // export modal clickEvent as handler
    window._openModal = openModal;

})(window, document);