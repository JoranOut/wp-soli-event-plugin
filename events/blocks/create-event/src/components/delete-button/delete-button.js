import './delete-button.scss';

import { __ } from '@wordpress/i18n';
import {Button} from "@wordpress/components"
import trashcan from "../../../../../../inc/assets/img/icons/delete.svg";

export default function DeleteButton(props) {
    return (
        <Button title={__('delete', 'soli-event')}
                className="delete-button"
                onClick={props.onClick}>
            <img src={trashcan}/>
        </Button>
    )
}
