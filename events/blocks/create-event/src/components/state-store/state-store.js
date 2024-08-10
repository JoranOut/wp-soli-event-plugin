import './state-store.scss';

import {useState, useEffect} from '@wordpress/element';
import {Button} from "@wordpress/components"
import undoSVG from "../../../../../../inc/assets/img/icons/undo arrow-1.svg";
import resetSVG from "../../../../../../inc/assets/img/icons/refresh.svg";
import redoSVG from "../../../../../../inc/assets/img/icons/redo arrow-1.svg";

const useHistory = (initialState, onChange) => {
    const [history, setHistory] = useState(initialState ? [initialState] : []);
    const [currentStep, setCurrentStep] = useState(0);
    const [latestIndex, setLatestIndex] = useState();

    const setNewState = (index, newState) => {
        console.log("StateStore SetNewState")
        console.log(index)
        console.log(latestIndex)
        console.log(newState)
        if (newState === undefined) {
            return;
        }

        if (index != null && latestIndex === index) {
            overrideLatestState(newState);
        } else {
            addNewState(newState);
        }
        setLatestIndex(index);
    };

    const addNewState = (newState) => {
        const updatedHistory = history.slice(0, currentStep + 1);

        setHistory([...updatedHistory, newState]);
        setCurrentStep(updatedHistory.length);
    };

    const overrideLatestState = (newState) => {
        if (currentStep > 0){
            history[currentStep] = newState;
            setHistory([...history]);
        }
    };

    const undo = () => {
        if (currentStep > 0) {
            onChange(history[currentStep - 1]);
            setCurrentStep(currentStep - 1);
        }
    };

    const redo = () => {
        if (currentStep < history.length - 1) {
            onChange(history[currentStep + 1]);
            setCurrentStep(currentStep + 1);
        }
    };

    const reset = () => {
        if (history.length > 1) {
            onChange(history[0]);
            setCurrentStep(0);
        }
    };

    return {
        setNewState,
        undo,
        redo,
        reset,
        canUndo: currentStep > 0,
        canRedo: currentStep < history.length - 1,
        canReset: currentStep > 0
    };
};

export default function StateStore(props) {
    const {setNewState, undo, redo, reset, canUndo, canRedo, canReset} = useHistory(undefined, props.onChange);

    useEffect(() => {
        setNewState(props.index, props.state)
    }, [props.state]);

    return <div>
        {history.length > 0 &&
            <div className="state-buttons">
                <Button className='undo-button' title='undo' onClick={undo} disabled={!canUndo}><img
                    src={undoSVG}/></Button>
                <Button className='redo-button' title='redo' onClick={redo} disabled={!canRedo}><img
                    src={redoSVG}/></Button>
                <Button className='reset-button' title='reset' onClick={reset} disabled={!canReset}><img
                    src={resetSVG}/></Button>
            </div>}
        {props.children}
    </div>;
}
