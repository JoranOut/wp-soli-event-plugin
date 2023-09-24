import "./index.scss"
import ListView from "./components/list-view/list-view"

wp.blocks.registerBlockType("soli/event-view-list", {
    title: "Event View List",
    icon: "list-view",
    category: "soli",
    edit: EditComponent
})

function EditComponent(props) {
    return (<ListView/>)
}

