export const ROOM_NAMES = ["Grote zaal", "Spiegelzaal", "Garderobe", "Studio 1", "Studio 2"];

export const displayRooms = (rooms) => {
    if (rooms?.length === ROOM_NAMES.length) {
        return "Hele gebouw";
    }
    if (rooms?.length > 0) {
        return rooms.map(i => ROOM_NAMES[i]).join(' + ');
    }
    return null;
}

export const showVenue = (itemLocation, itemRooms, fullLocation) => {
    if (itemLocation) {
        return fullLocation ? [itemLocation.name,itemLocation.address].join(", ") : itemLocation?.name;
    }

    if (itemRooms){
        return displayRooms(itemRooms);
    }

    return "geen locatie";
}

export const EVENT_STATUS = ["OPTION", "PENDING_APPROVAL", "PUBLIC", "PRIVATE"];

export const EVENT_STATUS_COLOR = {
    "OPTION": 'grey',
    "PENDING_APPROVAL": 'var(--wp-components-color-accent, var(--wp-admin-theme-color, #3858e9))',
    "PUBLIC": 'green',
    "PRIVATE": 'purple',
}
