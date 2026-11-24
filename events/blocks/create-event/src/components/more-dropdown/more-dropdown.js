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

    // Close on a click outside or Escape. The block renders in the editor
    // iframe, so listen on its own document and on the top document (sidebar,
    // header). An option's open modal pauses this until it closes.
    useEffect(() => {
        if (!open || isOptionOpen) return;

        const close = () => {
            dropdownActive(false);
            setOpen(false);
        };
        const handleOutsideClick = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                close();
            }
        };
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') close();
        };

        const docs = [...new Set([dropdownRef.current?.ownerDocument, document].filter(Boolean))];
        docs.forEach((doc) => {
            doc.addEventListener('mousedown', handleOutsideClick);
            doc.addEventListener('keydown', handleKeyDown);
        });
        return () => docs.forEach((doc) => {
            doc.removeEventListener('mousedown', handleOutsideClick);
            doc.removeEventListener('keydown', handleKeyDown);
        });
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