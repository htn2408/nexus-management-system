// Kho dữ liệu dùng chung cho cả ứng dụng (thay cho svelte/store của bản Svelte).
//
// Mỗi store giữ một giá trị và danh sách hàm lắng nghe. Code ngoài React
// (gọi API, đăng nhập, realtime) đọc/ghi qua get/set/update; component React
// đọc qua hook useStore, khi giá trị đổi thì component tự render lại.
import { useSyncExternalStore } from 'react';

export function writable(initialValue) {
  let value = initialValue;
  const listeners = new Set();

  function set(newValue) {
    if (Object.is(value, newValue)) return;
    value = newValue;
    listeners.forEach((listener) => listener(value));
  }

  function update(updater) {
    set(updater(value));
  }

  // Giống svelte/store: gọi listener ngay một lần với giá trị hiện tại,
  // trả về hàm huỷ đăng ký.
  function subscribe(listener) {
    listeners.add(listener);
    listener(value);
    return () => listeners.delete(listener);
  }

  return { set, update, subscribe, getValue: () => value };
}

// Store tính từ một store khác, ví dụ số thông báo chưa đọc từ danh sách thông báo.
export function derived(source, compute) {
  const result = writable(compute(get(source)));
  source.subscribe((sourceValue) => result.set(compute(sourceValue)));
  return { subscribe: result.subscribe, getValue: result.getValue };
}

// Bản chỉ đọc của một store: code bên ngoài đọc và lắng nghe được, nhưng không set được.
export function readonly(store) {
  return { subscribe: store.subscribe, getValue: store.getValue };
}

export function get(store) {
  return store.getValue();
}

// Mỗi store chỉ tạo một hàm subscribe cho React, để React không đăng ký lại sau mỗi lần render.
const reactSubscribers = new WeakMap();

function reactSubscribe(store) {
  if (!reactSubscribers.has(store)) {
    reactSubscribers.set(store, (onChange) => {
      let first = true;
      // subscribe gọi listener ngay lập tức; bỏ qua lần đó vì React đã đọc giá trị qua getValue.
      return store.subscribe(() => {
        if (first) {
          first = false;
          return;
        }
        onChange();
      });
    });
  }
  return reactSubscribers.get(store);
}

// Hook cho component: const user = useStore(authStore.currentUser);
export function useStore(store) {
  // Tham số thứ ba dùng khi render phía server (VD: kiểm thử render trong Node).
  return useSyncExternalStore(reactSubscribe(store), store.getValue, store.getValue);
}
