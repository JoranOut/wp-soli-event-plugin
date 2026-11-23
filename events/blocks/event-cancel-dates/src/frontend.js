import "./index.scss";
import { createRoot } from "@wordpress/element";
import CancelCalendar from "./components/cancel-calendar";

document.querySelectorAll(".soli-cancel-dates[data-endpoint]").forEach((root) => {
    const mount = root.querySelector(".soli-cancel-dates__app");
    createRoot(mount).render(
        <CancelCalendar
            endpoint={root.dataset.endpoint}
            token={root.dataset.token}
            i18n={JSON.parse(root.dataset.i18n || "{}")}
            initialDates={JSON.parse(root.dataset.dates || "[]")}
            initialDate={root.dataset.initial}
            locale={root.dataset.locale || "nl-NL"}
            weekStart={Number(root.dataset.weekStart || 1)}
        />
    );
});
