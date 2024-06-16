import apiFetch from '@wordpress/api-fetch';

export const searchLocation = (searchQuery) => {
    const x = async () => {
        try {
            const response = await fetch('blah', {signal: abortC.signal});
            return await response.json();
        } catch (ex) {
            console.log(ex);
        }
    };
}
