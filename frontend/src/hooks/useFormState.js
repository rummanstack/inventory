import { useState } from 'react';

export function useFormState(initialValues) {
  const [form, setForm] = useState(initialValues);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return { form, setForm, updateField, error, setError, saving, setSaving };
}
