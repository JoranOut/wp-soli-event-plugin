import './more-dropdown.scss';
import {useState, useEffect, useRef} from '@wordpress/element';

export default function MoreDropdown({label, children, dropdownActive}) {
    const [open, setOpen] = useState(false);
    const [isOptionOpen, setIsOptionOpen] = useState(false);
    const dropdownRef = useRef(null);

    const handleClick = (e) => {
        e.stopPropagation(); // Optional: prevents bubbling
        dropdownActive(!open);
        setOpen(!open);
    };

    // Close when clicking outside
    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                dropdownActive(false);
                setOpen(false);
            }
        };

        if (open && !isOptionOpen) {
            document.addEventListener('mousedown', handleOutsideClick);
        } else {
            document.removeEventListener('mousedown', handleOutsideClick);
        }

        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
        };
    }, [open, isOptionOpen]);

    return (
        <div className="more-dropdown"
             ref={dropdownRef}
        >
            {label && React.cloneElement(label, {
                onClick: handleClick,
                style: { cursor: 'pointer', ...label.props.style } // Add cursor and preserve any existing styles
            })}
            {open && (
                <div className="more-dropdown-options">
                    {React.Children.map(children, (child, i) =>
                        React.isValidElement(child)
                            ? React.cloneElement(child, {
                                key: i,
                                onOpen: () => setIsOptionOpen(true),
                                onClose: () => setIsOptionOpen(false),
                            })
                            : child
                    )}
                </div>
            )}
        </div>
    );
}