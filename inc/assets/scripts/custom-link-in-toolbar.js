// custom-link-in-toolbar.js
// wrapped into IIFE - to leave global space clean.
( function( window, wp ){

    const buttonId = ".edit-post-header .components-button.edit-post-fullscreen-mode-close";

    // check if gutenberg's editor root element is present.
    const editorEl = document.getElementById( 'editor' );
    if( !editorEl ){ // do nothing if there's no gutenberg root element on page.
        return;
    }

    const post_type =
        document.querySelector('body').classList.contains("post-type-page") ? "pages/overview" :
        "news";

    const unsubscribe = wp.data.subscribe( function () {
        setTimeout( function () {
            const dashboardButton = editorEl.querySelector( buttonId );
            if( dashboardButton instanceof HTMLElement ){
                dashboardButton.href = '/admin/'+post_type;
                dashboardButton.style.width = "initial";
                if (!dashboardButton.querySelector('p') && dashboardButton.querySelector('svg')){
                    let p = document.createElement("p");
                    p.innerHTML = "Terug";
                    p.style.fontSize = '1.1rem';
                    p.style.marginRight = '5px';
                    dashboardButton.insertAdjacentElement("beforeend",p);
                }
            }
        }, 1 )
    } );
    // unsubscribe is a function - it's not used right now 
    // but in case you'll need to stop this link from being reappeared at any point you can just call unsubscribe();

} )( window, wp )
