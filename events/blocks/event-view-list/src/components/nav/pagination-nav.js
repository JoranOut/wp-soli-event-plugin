import './pagination-nav.scss';

function getNavPages(current, total) {
    const set = new Set();

    set.add(1);
    set.add(total);

    for (let i = current - 1; i <= current + 1; i++) {
        if (i > 1 && i < total) set.add(i);
    }

    const pages = Array.from(set).sort((a, b) => a - b);

    const navPages = [];
    let prev = null;
    for (let page of pages) {
        if (prev !== null && page - prev > 1) {
            navPages.push('...');
        }
        navPages.push(page);
        prev = page;
    }

    return navPages;
}



export default function PaginationNav({ currentPage, totalPages, setCurrentPage }) {
    if (totalPages <= 1) return null;
    let pages = getNavPages(currentPage, totalPages);

    const goTo = (page) => {
        if (typeof page === "number" && page !== currentPage) {
            setCurrentPage(page);
        }
    };

    return (
        <nav className="nav" aria-label="Pagination">
            { currentPage !== 1 && (
                <button type="button" className="page-link"
                        onClick={() => goTo(currentPage - 1)}
                        aria-label="Previous page">
                    &#x3C; prev
                </button>
            )}
            {pages.map((page, idx) =>
                page === '...' ? (
                    <span key={`ellipsis-${idx}`} style={{ margin: '0 4px' }}>…</span>
                ) : (
                    <button
                        type="button"
                        className="page-link"
                        key={page}
                        onClick={() => goTo(page)}
                        disabled={page === currentPage}
                        style={{
                            fontWeight: page === currentPage ? 'bold' : 'normal',
                            textDecoration: page === currentPage ? 'none' : 'underline',
                            color: page === currentPage ? '#333' : '#0073aa'
                        }}
                        aria-current={page === currentPage ? 'page' : undefined}
                    >
                        {page}
                    </button>
                )
            )}
            { currentPage !== totalPages &&
                <button type="button" className="page-link"
                        onClick={() => goTo(currentPage + 1)}
                        aria-label="Next page">
                    next &#x3E;
                </button>
            }
        </nav>
    );
}
