import { useState } from 'react';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import ImagePlaceholder from './shared/ImagePlaceholder.jsx';
import SectionHeader from './shared/SectionHeader.jsx';
import { contactApi } from '../../../services/api/contactApi.js';
import { contactUsImage } from '../constants.js';

export default function ContactSection({ t }) {
  const [form, setForm] = useState({ name: '', phone: '', message: '' });
  const [status, setStatus] = useState('idle');

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!form.name.trim() || !form.phone.trim() || !form.message.trim()) {
      return;
    }

    setStatus('sending');
    try {
      await contactApi.submitContact(form);
      setStatus('success');
      setForm({ name: '', phone: '', message: '' });
    } catch {
      setStatus('error');
    }
  }

  return (
    <section id="contact-form" className="landing-section landing-section-brand">
      <div className="landing-container">
        <SectionHeader
          label={t('landing.contact.label')}
          title={t('landing.contact.title')}
          description={t('landing.contact.description')}
        />

        <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-center">
          <div className="lg:w-1/2">
            <ImagePlaceholder data={{ src: contactUsImage, alt: t('landing.images.contactUs') }} heightClass="aspect-[4/3]" />
          </div>

          <form onSubmit={handleSubmit} className="contact-form lg:w-1/2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="contact-label" htmlFor="contact-name">{t('landing.contact.nameLabel')}</label>
                <input
                  id="contact-name"
                  type="text"
                  required
                  value={form.name}
                  onChange={(event) => updateField('name', event.target.value)}
                  placeholder={t('landing.contact.namePlaceholder')}
                  className="contact-input"
                />
              </div>
              <div>
                <label className="contact-label" htmlFor="contact-phone">{t('landing.contact.phoneLabel')}</label>
                <input
                  id="contact-phone"
                  type="tel"
                  required
                  value={form.phone}
                  onChange={(event) => updateField('phone', event.target.value)}
                  placeholder={t('landing.contact.phonePlaceholder')}
                  className="contact-input"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="contact-label" htmlFor="contact-message">{t('landing.contact.messageLabel')}</label>
              <textarea
                id="contact-message"
                required
                rows={4}
                value={form.message}
                onChange={(event) => updateField('message', event.target.value)}
                placeholder={t('landing.contact.messagePlaceholder')}
                className="contact-input resize-none"
              />
            </div>

            <button type="submit" className="btn-primary mt-5 rounded-2xl" disabled={status === 'sending'}>
              {status === 'sending' ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              {status === 'sending' ? t('landing.contact.sending') : t('landing.contact.submit')}
            </button>

            {status === 'success' ? (
              <p className="contact-feedback contact-feedback-success">
                <CheckCircle2 size={18} className="shrink-0" />
                {t('landing.contact.successText')}
              </p>
            ) : null}
            {status === 'error' ? (
              <p className="contact-feedback contact-feedback-error">{t('landing.contact.errorText')}</p>
            ) : null}
          </form>
        </div>
      </div>
    </section>
  );
}
