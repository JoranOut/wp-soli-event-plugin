import './copy-button.scss';

import {Button} from "@wordpress/components"
import copySVG from "../../../../../../inc/assets/img/icons/copy.svg";

export default function CopyButton(props) {
    return (
        <Button
            className="copy-button"
            variant="secondary"
            onClick={() => props.onClick()}>
            <img src={copySVG}/>
        </Button>
    )
}
