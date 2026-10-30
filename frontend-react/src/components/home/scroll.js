// Cuộn mượt tới một khu trên trang chủ theo id (intro, plans, shops).
export function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
}
