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

    const handleClick = (page, e) => {
        e.preventDefault();
        if (typeof page === "number" && page !== currentPage) {
            setCurrentPage(page);
        }
    };

    return (
        <nav className="nav" aria-label="Pagination">
            { currentPage !== 1 && (
                <a href="#"
                   onClick={e => handleClick(currentPage - 1, e)}>
                    &#x3C; prev
                </a>
            )}
            {pages.map((page, idx) =>
                page === '...' ? (
                    <span key={idx === 1 ? idx + 1 : totalPages - 1} style={{ margin: '0 4px' }}>…</span>
                ) : (
                    <a
                        href="#"
                        key={page}
                        onClick={e => handleClick(page, e)}
                        style={{
                            fontWeight: page === currentPage ? 'bold' : 'normal',
                            textDecoration: page === currentPage ? 'none' : 'underline',
                            pointerEvents: page === currentPage ? 'none' : 'auto',
                            color: page === currentPage ? '#333' : '#0073aa'
                        }}
                        aria-current={page === currentPage ? 'page' : undefined}
                    >
                        {page}
                    </a>
                )
            )}
            { currentPage !== totalPages &&
                <a href="#"
                   onClick={e => handleClick(currentPage + 1, e)}>
                    next &#x3E;
                </a>
            }
        </nav>
    );
}
