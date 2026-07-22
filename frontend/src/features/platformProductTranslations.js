import { at } from './accounting-foundation/accountingTranslations.js';

const BN = {
  'Failed to load':'লোড ব্যর্থ হয়েছে','Could not load registration requests.':'রেজিস্ট্রেশন অনুরোধ লোড করা যায়নি।','Registration approved':'রেজিস্ট্রেশন অনুমোদিত',
  'Registration rejected':'রেজিস্ট্রেশন প্রত্যাখ্যাত','The business becomes active immediately and the owner can log in with the password they chose at registration.':'ব্যবসাটি সঙ্গে সঙ্গে সক্রিয় হবে এবং মালিক রেজিস্ট্রেশনের সময় দেওয়া পাসওয়ার্ড দিয়ে লগইন করতে পারবেন।',
  'The owner will not be able to log in. You can still approve this registration later.':'মালিক লগইন করতে পারবেন না। পরে চাইলে এই রেজিস্ট্রেশন অনুমোদন করতে পারবেন।',
  'Registration Requests':'রেজিস্ট্রেশন অনুরোধ','Contact Messages':'যোগাযোগের বার্তা','Approve':'অনুমোদন করুন','Reject':'প্রত্যাখ্যান করুন','Refresh':'রিফ্রেশ',
  'Pending':'অপেক্ষমাণ','Rejected':'প্রত্যাখ্যাত','Approval failed':'অনুমোদন ব্যর্থ হয়েছে','Rejection failed':'প্রত্যাখ্যান ব্যর্থ হয়েছে',
  'No pending registrations':'কোনো অপেক্ষমাণ রেজিস্ট্রেশন নেই','New signups from the landing page will appear here.':'ল্যান্ডিং পেজ থেকে নতুন সাইনআপ এখানে দেখা যাবে।',
  'Businesses that signed up from the landing page and are waiting for activation.':'ল্যান্ডিং পেজ থেকে সাইনআপ করা এবং সক্রিয়করণের অপেক্ষায় থাকা ব্যবসাসমূহ।',
  'No messages yet':'এখনও কোনো বার্তা নেই','Contact form submissions will appear here.':'যোগাযোগ ফর্মের বার্তাগুলো এখানে দেখা যাবে।',
  'Everyone who reached out via the landing page contact form.':'ল্যান্ডিং পেজের যোগাযোগ ফর্মের মাধ্যমে যারা যোগাযোগ করেছেন।',
  'Select all':'সব নির্বাচন করুন','Deselect all':'সব নির্বাচন বাতিল করুন','Controlled':'নিয়ন্ত্রিত','Active':'সক্রিয়','Inactive':'নিষ্ক্রিয়',
  'Electronics':'ইলেকট্রনিকস','Grocery / FMCG':'গ্রোসারি / FMCG','Pharmacy':'ফার্মেসি','Wholesale':'হোলসেল','Retail':'রিটেইল','Other':'অন্যান্য',
  'is now active.':'এখন সক্রিয় হয়েছে।','was rejected.':'প্রত্যাখ্যাত হয়েছে।','Could not load contact messages.':'যোগাযোগের বার্তা লোড করা যায়নি।',
  'Failed to add.':'যোগ করা যায়নি।','Failed to save.':'সংরক্ষণ করা যায়নি।','Error':'ত্রুটি','Cannot delete — it may still have products.':'মুছে ফেলা যাচ্ছে না — এর অধীনে এখনও পণ্য থাকতে পারে।',
};

export function pt(text) {
  const language = typeof document !== 'undefined' ? document.documentElement.lang : 'en';
  if (language !== 'bn' || text === null || text === undefined) return text;
  const value = String(text);
  return BN[value] ?? at(value);
}