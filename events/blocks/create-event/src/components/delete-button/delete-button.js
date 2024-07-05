import './delete-button.scss';

import {Button} from "@wordpress/components"
import trashcan from "../../../../../../inc/assets/img/icons/delete.svg";

export default function DeleteButton(props) {
    return (
        <Button title='delete'
                className="delete-button"
                onClick={props.onClick}>
            <img src={trashcan}/>
        </Button>
    )
}
