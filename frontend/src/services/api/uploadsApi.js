import { uploadRequest } from './client.js';

export const uploadsApi = {
  uploadPhoto(file) {
    const formData = new FormData();
    formData.append('photo', file);
    return uploadRequest('/uploads/photo', formData);
  },
};
