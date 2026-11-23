const Icon = ({children, size = 18}) => (
    <svg
        className="soli-reserve-icon"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
    >
        {children}
    </svg>
);

export const PlusIcon = () => <Icon><path d="M12 5v14M5 12h14"/></Icon>;

export const NextDayIcon = () => (
    <Icon>
        <rect x="3.5" y="5" width="13" height="14" rx="2"/>
        <path d="M3.5 9.5h13M7.5 3v4M12.5 3v4M19 10l2.5 2.5L19 15M16.5 12.5h5"/>
    </Icon>
);

export const TrashIcon = () => (
    <Icon><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></Icon>
);

export const MailIcon = () => (
    <Icon><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 6.5 8.5 6.5 8.5-6.5"/></Icon>
);

export const CopyIcon = () => (
    <Icon><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></Icon>
);

export const CheckIcon = () => <Icon><path d="m5 12.5 4.5 4.5L19 7.5"/></Icon>;

export const AlertIcon = () => (
    <Icon size={16}><path d="M12 4 2.8 19.5h18.4L12 4ZM12 10v4.5M12 17.2v.1"/></Icon>
);
