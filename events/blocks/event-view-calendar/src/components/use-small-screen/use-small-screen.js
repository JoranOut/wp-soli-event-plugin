import {useState, useEffect} from '@wordpress/element';

// Matches the 640px breakpoint in calendar-wrapper.scss.
export const SMALL_SCREEN_QUERY = '(max-width: 640px)';

export default function useSmallScreen() {
    const [isSmall, setIsSmall] = useState(() => window.matchMedia(SMALL_SCREEN_QUERY).matches);

    useEffect(() => {
        const query = window.matchMedia(SMALL_SCREEN_QUERY);
        const onChange = (e) => setIsSmall(e.matches);
        query.addEventListener('change', onChange);
        setIsSmall(query.matches);
        return () => query.removeEventListener('change', onChange);
    }, []);

    return isSmall;
}
