import { vt } from '../vouchers/voucherTranslations.js';

const BN = {
  'Saving...':'সংরক্ষণ হচ্ছে...','Save':'সংরক্ষণ করুন','Save Settings':'সেটিংস সংরক্ষণ করুন','Closing...':'বন্ধ করা হচ্ছে...','Close Fiscal Year':'অর্থবছর বন্ধ করুন',
  'Reopening...':'পুনরায় খোলা হচ্ছে...','Reopen Fiscal Year':'অর্থবছর পুনরায় খুলুন','Generating...':'তৈরি হচ্ছে...','Generate Opening Balances':'ওপেনিং ব্যালেন্স তৈরি করুন',
  'Show zero accounts':'শূন্য ব্যালেন্সের অ্যাকাউন্ট দেখান',
  'Account Ledger':'অ্যাকাউন্ট লেজার','All accounts':'সব অ্যাকাউন্ট','All customers':'সব কাস্টমার','All fiscal years':'সব অর্থবছর','All periods':'সব পিরিয়ড','All suppliers':'সব সাপ্লায়ার',
  'As of date':'যে তারিখ পর্যন্ত','Assets':'সম্পদ','Balance':'ব্যালেন্স','Balance Sheet':'ব্যালেন্স শিট','Balance Sheet Identity':'ব্যালেন্স শিট সমীকরণ','Balanced':'ব্যালেন্সড','Bank Book':'ব্যাংক বুক',
  'Cash Book':'ক্যাশ বুক','Cash Flow':'ক্যাশ ফ্লো','Cash Flow Check':'ক্যাশ ফ্লো যাচাই','Closing Balance':'ক্লোজিং ব্যালেন্স','Closing Cash':'ক্লোজিং ক্যাশ','Closing Cr':'ক্লোজিং ক্রেডিট',
  'Closing Dr':'ক্লোজিং ডেবিট','Customer Ledger':'কাস্টমার লেজার','Date from':'শুরুর তারিখ','Date to':'শেষ তারিখ','Financing Activities':'অর্থায়ন কার্যক্রম','General Ledger':'জেনারেল লেজার',
  'Investing Activities':'বিনিয়োগ কার্যক্রম','Liabilities':'দায়','Narration':'বিবরণ','Net Cash Movement':'নেট ক্যাশ মুভমেন্ট','Opening Balance':'ওপেনিং ব্যালেন্স','Opening Cash':'ওপেনিং ক্যাশ',
  'Opening Cr':'ওপেনিং ক্রেডিট','Opening Dr':'ওপেনিং ডেবিট','Operating Activities':'অপারেটিং কার্যক্রম','Out of Balance':'ব্যালেন্সের বাইরে','Outstanding':'বকেয়া','Retained Earnings':'রিটেইনড আর্নিংস',
  'Review':'পর্যালোচনা','Select a date range':'তারিখের সীমা নির্বাচন করুন','Supplier Ledger':'সাপ্লায়ার লেজার','Total Equity':'মোট ইকুইটি','Trial Balance':'ট্রায়াল ব্যালেন্স','Voucher':'ভাউচার',
  'Adjust the filters or wait for posted journal activity in the selected accounts.':'ফিল্টার পরিবর্তন করুন অথবা নির্বাচিত অ্যাকাউন্টে পোস্ট করা জার্নাল কার্যক্রমের জন্য অপেক্ষা করুন।',
  'Assets, liabilities, and equity calculated dynamically from journal balances.':'জার্নাল ব্যালেন্স থেকে সম্পদ, দায় ও ইকুইটি স্বয়ংক্রিয়ভাবে হিসাব করা হয়।',
  'Cash flow requires both a start date and an end date.':'ক্যাশ ফ্লোর জন্য শুরুর ও শেষ—দুটি তারিখই প্রয়োজন।',
  'Indirect cash flow built dynamically from journal movement and profit activity.':'জার্নাল মুভমেন্ট ও লাভের কার্যক্রম থেকে পরোক্ষ ক্যাশ ফ্লো স্বয়ংক্রিয়ভাবে তৈরি হয়।',
  'Journal-driven ledger with opening balance, transaction flow, and running balance.':'ওপেনিং ব্যালেন্স, লেনদেন প্রবাহ ও চলমান ব্যালেন্সসহ জার্নালভিত্তিক লেজার।',
  'Opening, movement, and closing totals calculated directly from the journal engine.':'ওপেনিং, মুভমেন্ট ও ক্লোজিং মোট সরাসরি জার্নাল ইঞ্জিন থেকে হিসাব করা হয়।',
  'Party ledger generated from journal activity affecting receivable or payable accounts.':'প্রাপ্য বা প্রদেয় অ্যাকাউন্টে প্রভাব ফেলা জার্নাল কার্যক্রম থেকে পার্টি লেজার তৈরি হয়।',
  'The ledger will load once a party is selected.':'পার্টি নির্বাচন করলে লেজার লোড হবে।',
  'Auto posting enabled':'অটো পোস্টিং সক্রিয়','Set as active':'সক্রিয় হিসেবে সেট করুন','Account updated.':'অ্যাকাউন্ট আপডেট হয়েছে।','Account created.':'অ্যাকাউন্ট তৈরি হয়েছে।',
  'Settings updated.':'সেটিংস আপডেট হয়েছে।','Failed to save accounting settings.':'অ্যাকাউন্টিং সেটিংস সংরক্ষণ করা যায়নি।','Opening balance updated.':'ওপেনিং ব্যালেন্স আপডেট হয়েছে।',
  'Opening balance created.':'ওপেনিং ব্যালেন্স তৈরি হয়েছে।','Fiscal Years':'অর্থবছরসমূহ','Fiscal year created.':'অর্থবছর তৈরি হয়েছে।','Request failed.':'অনুরোধ ব্যর্থ হয়েছে।',
  'Failed to load close checklist.':'ক্লোজ চেকলিস্ট লোড করা যায়নি।','Fiscal year closed.':'অর্থবছর বন্ধ হয়েছে।','Failed to close fiscal year.':'অর্থবছর বন্ধ করা যায়নি।',
  'Fiscal year reopened.':'অর্থবছর পুনরায় খোলা হয়েছে।','Fiscal year activated.':'অর্থবছর সক্রিয় হয়েছে।','Period locked.':'পিরিয়ড লক হয়েছে।','Period unlocked.':'পিরিয়ড আনলক হয়েছে।',
  'Period closed.':'পিরিয়ড বন্ধ হয়েছে।','Period reopened.':'পিরিয়ড পুনরায় খোলা হয়েছে।','Period opened.':'পিরিয়ড খোলা হয়েছে।','opening balances generated.':'টি ওপেনিং ব্যালেন্স তৈরি হয়েছে।',
  'Account Group':'অ্যাকাউন্ট গ্রুপ','Accounting':'অ্যাকাউন্টিং','Accounting Dashboard':'অ্যাকাউন্টিং ড্যাশবোর্ড','Accounting Period':'অ্যাকাউন্টিং পিরিয়ড','Accounting Settings':'অ্যাকাউন্টিং সেটিংস',
  'Active':'সক্রিয়','Add Account':'অ্যাকাউন্ট যোগ করুন','Add Opening Balance':'ওপেনিং ব্যালেন্স যোগ করুন','Allow':'অনুমোদন','Balance Side':'ব্যালেন্স সাইড','Bank':'ব্যাংক','Block':'ব্লক','Cash':'ক্যাশ',
  'Chart of Accounts':'চার্ট অব অ্যাকাউন্টস','Close':'বন্ধ করুন','Code':'কোড','Create Fiscal Year':'অর্থবছর তৈরি করুন','Current Bank Balance':'বর্তমান ব্যাংক ব্যালেন্স','Current Cash':'বর্তমান ক্যাশ',
  'Date Range':'তারিখের সীমা','Decimal Precision':'দশমিক নির্ভুলতা','Default Currency':'ডিফল্ট মুদ্রা','Draft Journals':'ড্রাফট জার্নাল','End Date':'শেষ তারিখ','Entity':'এনটিটি',
  'Equity':'ইকুইটি','Expenses':'খরচ','Financial Year Start (MM-DD)':'অর্থবছর শুরু (MM-DD)','Fiscal Year':'অর্থবছর','Fiscal Years & Periods':'অর্থবছর ও পিরিয়ড','Flags':'ফ্ল্যাগ',
  'General Ledger Account':'জেনারেল লেজার অ্যাকাউন্ট','Generate Openings':'ওপেনিং তৈরি করুন','Group':'গ্রুপ','Income':'আয়','Legacy Voucher Prefix':'লিগ্যাসি ভাউচার প্রিফিক্স',
  'Journal Voucher Prefix':'জার্নাল ভাউচার প্রিফিক্স','Receipt Voucher Prefix':'রিসিপ্ট ভাউচার প্রিফিক্স','Payment Voucher Prefix':'পেমেন্ট ভাউচার প্রিফিক্স','Contra Voucher Prefix':'কন্ট্রা ভাউচার প্রিফিক্স',
  'Lock':'লক','Locked':'লক করা','Locked Periods':'লক করা পিরিয়ড','Name':'নাম','Negative Cash Policy':'নেগেটিভ ক্যাশ নীতি','None':'কোনোটিই নয়','Open':'খুলুন','Open Periods':'খোলা পিরিয়ড',
  'Opening Balances':'ওপেনিং ব্যালেন্স','Openings Generated':'ওপেনিং তৈরি হয়েছে','Parent':'প্যারেন্ট','Parent Account':'প্যারেন্ট অ্যাকাউন্ট','Payable':'প্রদেয়','Pending Approvals':'অপেক্ষমাণ অনুমোদন',
  'Period':'পিরিয়ড','Posting Window':'পোস্টিং উইন্ডো','Quick Links':'দ্রুত লিংক','Receivable':'প্রাপ্য','Receivable / Payable':'প্রাপ্য / প্রদেয়','Recent Accounting Activity':'সাম্প্রতিক অ্যাকাউন্টিং কার্যক্রম',
  'Reopen':'পুনরায় খুলুন','Reopen Year':'অর্থবছর পুনরায় খুলুন','Set Active':'সক্রিয় করুন','Side':'পাশ','Source Fiscal Year':'উৎস অর্থবছর','Start Date':'শুরুর তারিখ','System':'সিস্টেম',
  'Time':'সময়','Total Assets':'মোট সম্পদ','Total Liabilities':'মোট দায়','Unlock':'আনলক','Unlocked':'আনলক করা','Warn':'সতর্ক করুন',
  'Common accounting control entry points.':'সাধারণ অ্যাকাউন্টিং নিয়ন্ত্রণের প্রবেশপথ।','Current fiscal year, current period, and queue status.':'বর্তমান অর্থবছর, পিরিয়ড ও কিউ স্ট্যাটাস।',
  'Control posting windows, close years with a checklist, and carry balances into the next fiscal year.':'পোস্টিং সময়সীমা নিয়ন্ত্রণ, চেকলিস্টসহ অর্থবছর বন্ধ এবং পরবর্তী বছরে ব্যালেন্স স্থানান্তর করুন।',
  'Each opening balance posts a proper journal entry against owner�s equity and stays inside the journal engine.':'প্রতিটি ওপেনিং ব্যালেন্স মালিকের ইকুইটির বিপরীতে সঠিক জার্নাল এন্ট্রি পোস্ট করে।',
  'Journal-driven financial totals, posting window status, and close-control visibility for accountants.':'অ্যাকাউন্ট্যান্টদের জন্য জার্নালভিত্তিক আর্থিক মোট, পোস্টিং উইন্ডো ও ক্লোজিং নিয়ন্ত্রণ।',
  'Manage parent and child accounts without touching the existing system account codes.':'বিদ্যমান সিস্টেম অ্যাকাউন্ট কোড পরিবর্তন না করে প্যারেন্ট ও চাইল্ড অ্যাকাউন্ট পরিচালনা করুন।',
  'No closed source fiscal year is available before this year.':'এই বছরের আগে কোনো বন্ধ উৎস অর্থবছর নেই।','No recent accounting activity.':'সাম্প্রতিক কোনো অ্যাকাউন্টিং কার্যক্রম নেই।',
  'Recent period, fiscal year, opening balance, voucher, and report actions.':'সাম্প্রতিক পিরিয়ড, অর্থবছর, ওপেনিং ব্যালেন্স, ভাউচার ও রিপোর্ট কার্যক্রম।',
  'Review the close checklist before locking the fiscal year.':'অর্থবছর লক করার আগে ক্লোজ চেকলিস্ট পর্যালোচনা করুন।','Close is blocked until every checklist item passes.':'সব চেকলিস্ট আইটেম পাস না করা পর্যন্ত বন্ধ করা যাবে না।',
  'Voucher numbering, posting behavior, and accounting display settings reused across the ERP.':'ERP জুড়ে ব্যবহৃত ভাউচার নম্বর, পোস্টিং আচরণ ও অ্যাকাউন্টিং প্রদর্শন সেটিংস।',
};

export function at(text) {
  const language = typeof document !== 'undefined' ? document.documentElement.lang : 'en';
  if (language !== 'bn' || text === null || text === undefined) return text;
  const value = String(text);
  return BN[value] ?? vt('bn', value);
}