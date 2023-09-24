import { render } from '@wordpress/element';
import ListView from "./components/list-view/list-view";

const divsToUpdate = document.querySelectorAll(".block-event-view-list")

divsToUpdate.forEach(function(div) {
    render(<ListView />, div)
    div.classList.remove("block-event-view-LIST")
})
