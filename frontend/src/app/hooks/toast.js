import { toast } from 'sonner';

export function pushToast(type, title, message = '') {
  const opts = message ? { description: message } : undefined;
  if (type === 'success') return toast.success(title, opts);
  if (type === 'error') return toast.error(title, opts);
  if (type === 'warning') return toast.warning(title, opts);
  return toast.info(title, opts);
}
