// Phân trang một danh sách ở phía giao diện.
//   const pager = usePagination(filteredOrders, 8);
//   pager.items          -> các dòng của trang đang xem
//   <Pagination {...pager.props} />
// Số trang luôn nằm trong [1, tổng số trang], kể cả khi danh sách vừa bị lọc ngắn lại.
import { useState } from 'react';

export function usePagination(list, pageSize = 8) {
  const [requestedPage, setPage] = useState(1);
  const totalItems = list.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const start = (page - 1) * pageSize;

  return {
    page,
    setPage,
    totalPages,
    items: list.slice(start, start + pageSize),
    props: { currentPage: page, totalItems, pageSize, onPageChange: setPage },
  };
}
