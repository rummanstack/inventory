import { Link, Navigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  BookOpenText,
  Boxes,
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  Landmark,
  MessageCircle,
  ReceiptText,
  Route,
  ShieldCheck,
  Users,
  Wrench,
} from 'lucide-react';
import { usePublicLanguage, buildLocalizedPath } from '../../../app/hooks/usePublicLanguage.js';
import { usePublicPageEffects } from '../hooks/usePublicPageEffects.js';
import LandingHeader from '../components/LandingHeader.jsx';
import LandingFooter from '../components/LandingFooter.jsx';
import DeferredLandingAiChatWidget from '../components/DeferredLandingAiChatWidget.jsx';
import ImagePlaceholder from '../components/shared/ImagePlaceholder.jsx';
import { whatsappUrl } from '../constants.js';
import { featurePages, getFeaturePage, getSolutionPage, solutionPages } from '../data/seoPages.js';

const featureIcons = {
  'inventory-management': Boxes,
  'retail-pos': ReceiptText,
  accounting: BookOpenText,
  'hr-payroll': Users,
  'purchase-management': Building2,
  'due-collection': CreditCard,
  'dsr-dealer-management': Route,
  'installment-sales': CreditCard,
  reporting: BarChart3,
  'repair-warranty': Wrench,
};

const solutionIcons = {
  'retail-shop': ReceiptText,
  'wholesale-business': Boxes,
  'dealer-distributor': Building2,
  'dsr-sales-team': Route,
  pharmacy: ShieldCheck,
  'grocery-store': Landmark,
};

const pageSupport = {
  accounting: {
    relatedModules: ['reporting', 'due-collection', 'purchase-management'],
    en: {
      painPoints: [
        'Sales, purchases, expenses, dues, and cash movement live in separate notebooks or spreadsheets.',
        'Owners wait too long to see real profit, receivables, payables, and cash position.',
        'Accountants have to rebuild reports from operational data instead of reviewing ready records.',
      ],
      outcomes: [
        'Faster month-end and day-end visibility for cash, bank, expenses, and receivables.',
        'Cleaner handoff between owner, manager, cashier, and accountant.',
        'Better confidence in ledger, trial balance, profit and loss, and balance sheet review.',
      ],
    },
    bn: {
      painPoints: [
        'সেলস, পারচেজ, খরচ, বকেয়া এবং ক্যাশ মুভমেন্ট আলাদা খাতা বা স্প্রেডশিটে থাকে।',
        'মালিকরা প্রকৃত প্রফিট, প্রাপ্য, দেয় এবং ক্যাশ পজিশন দেখতে অনেক দেরি করেন।',
        'অ্যাকাউন্ট্যান্টদের রেডি রেকর্ড রিভিউ করার বদলে অপারেশনাল ডেটা থেকে রিপোর্ট পুনর্নির্মাণ করতে হয়।',
      ],
      outcomes: [
        'ক্যাশ, ব্যাংক, খরচ এবং প্রাপ্যের জন্য দ্রুত মাসশেষ ও দিনশেষ ভিজিবিলিটি।',
        'মালিক, ম্যানেজার, ক্যাশিয়ার এবং অ্যাকাউন্ট্যান্টের মধ্যে পরিষ্কার হ্যান্ডঅফ।',
        'লেজার, ট্রায়াল ব্যালেন্স, প্রফিট অ্যান্ড লস এবং ব্যালেন্স শিট রিভিউতে ভালো আস্থা।',
      ],
    },
  },
  'inventory-management': {
    relatedModules: ['retail-pos', 'purchase-management', 'reporting'],
    en: {
      painPoints: [
        'Teams sell items before checking stock availability and reorder too late.',
        'Damaged stock, returns, and purchase receive entries are hard to reconcile later.',
        'The owner cannot quickly see which products move, stall, or tie up cash.',
      ],
      outcomes: [
        'Fewer stock surprises at the counter or during wholesaler delivery planning.',
        'Clearer purchase decisions from low-stock visibility and movement history.',
        'Better connection between stock value, purchases, sales, and profit reporting.',
      ],
    },
    bn: {
      painPoints: [
        'টিম স্টক অ্যাভেইলেবিলিটি চেক না করেই আইটেম বিক্রি করে এবং অনেক দেরিতে রিঅর্ডার করে।',
        'ড্যামেজড স্টক, রিটার্ন এবং পারচেজ রিসিভ এন্ট্রি পরে মেলানো কঠিন হয়ে যায়।',
        'মালিক দ্রুত দেখতে পারেন না কোন প্রোডাক্ট চলছে, আটকে আছে, বা টাকা আটকে রাখছে।',
      ],
      outcomes: [
        'কাউন্টারে বা হোলসেলার ডেলিভারি পরিকল্পনায় কম স্টক বিস্ময়।',
        'লো-স্টক ভিজিবিলিটি ও মুভমেন্ট হিস্ট্রি থেকে পরিষ্কার পারচেজ সিদ্ধান্ত।',
        'স্টক ভ্যালু, পারচেজ, সেলস এবং প্রফিট রিপোর্টিংয়ের মধ্যে ভালো সংযোগ।',
      ],
    },
  },
  'retail-pos': {
    relatedModules: ['inventory-management', 'due-collection', 'reporting'],
    en: {
      painPoints: [
        'Counter billing slows down during rush hours and receipts are inconsistent.',
        'Cash sales, due sales, returns, and stock changes are tracked in different places.',
        'Owners cannot close the day confidently because counter activity is incomplete.',
      ],
      outcomes: [
        'Faster billing with better visibility into sales, stock, and customer balance changes.',
        'Cleaner daily closing through cash sessions, receipts, and daily sales reporting.',
        'A retail workflow that can grow from one counter to a more controlled team setup.',
      ],
    },
    bn: {
      painPoints: [
        'ব্যস্ত সময়ে কাউন্টার বিলিং ধীর হয়ে যায় এবং রিসিট অসামঞ্জস্যপূর্ণ থাকে।',
        'ক্যাশ সেলস, বকেয়া সেলস, রিটার্ন এবং স্টক পরিবর্তন আলাদা জায়গায় ট্র্যাক হয়।',
        'কাউন্টার অ্যাক্টিভিটি অসম্পূর্ণ থাকায় মালিক আত্মবিশ্বাসের সাথে দিন বন্ধ করতে পারেন না।',
      ],
      outcomes: [
        'সেলস, স্টক এবং কাস্টমার ব্যালেন্স পরিবর্তনের ভালো ভিজিবিলিটি সহ দ্রুত বিলিং।',
        'ক্যাশ সেশন, রিসিট এবং দৈনিক সেলস রিপোর্টিংয়ের মাধ্যমে পরিষ্কার দৈনিক ক্লোজিং।',
        'একটি রিটেইল ওয়ার্কফ্লো যা এক কাউন্টার থেকে আরও নিয়ন্ত্রিত টিম সেটআপে বেড়ে উঠতে পারে।',
      ],
    },
  },
  'hr-payroll': {
    relatedModules: ['accounting', 'reporting'],
    en: {
      painPoints: [
        'Attendance, leave, salary, and employee records are maintained manually.',
        'The business knows team cost only after late manual summaries.',
        'Permissions and user control do not match real job roles inside the company.',
      ],
      outcomes: [
        'Structured employee records with less dependence on ad hoc files and messaging threads.',
        'Better payroll and finance coordination for salary payments, advances, and loans.',
        'Stronger control over who can access which workflow inside the system.',
      ],
    },
    bn: {
      painPoints: [
        'উপস্থিতি, ছুটি, বেতন এবং কর্মচারী রেকর্ড ম্যানুয়ালি রক্ষণাবেক্ষণ করা হয়।',
        'ব্যবসা টিমের খরচ শুধু দেরিতে আসা ম্যানুয়াল সামারির পরেই জানতে পারে।',
        'পারমিশন ও ইউজার কন্ট্রোল কোম্পানির প্রকৃত জব রোলের সাথে মেলে না।',
      ],
      outcomes: [
        'অস্থায়ী ফাইল ও মেসেজিং থ্রেডের উপর কম নির্ভরতা সহ স্ট্রাকচার্ড কর্মচারী রেকর্ড।',
        'বেতন পেমেন্ট, অগ্রিম এবং ঋণের জন্য ভালো পেরোল ও ফাইন্যান্স সমন্বয়।',
        'সিস্টেমের মধ্যে কে কোন ওয়ার্কফ্লো অ্যাক্সেস করতে পারবে তার উপর শক্তিশালী নিয়ন্ত্রণ।',
      ],
    },
  },
  'purchase-management': {
    relatedModules: ['inventory-management', 'accounting', 'reporting'],
    en: {
      painPoints: [
        'Supplier balances become unclear when returns, discounts, and payments are not tied to the same record set.',
        'Received stock and supplier statements do not match at review time.',
        'Owners lose time resolving purchase disputes with incomplete history.',
      ],
      outcomes: [
        'Better visibility into purchase receive, supplier due, returns, and payment history.',
        'Cleaner supplier conversations through structured statements and records.',
        'Stronger stock and finance accuracy because purchase activity feeds both sides.',
      ],
    },
    bn: {
      painPoints: [
        'রিটার্ন, ডিসকাউন্ট এবং পেমেন্ট একই রেকর্ড সেটের সাথে যুক্ত না থাকলে সাপ্লায়ার ব্যালেন্স অস্পষ্ট হয়ে যায়।',
        'রিভিউর সময় গৃহীত স্টক ও সাপ্লায়ার স্টেটমেন্ট মেলে না।',
        'অসম্পূর্ণ হিস্ট্রি নিয়ে পারচেজ বিরোধ সমাধানে মালিকরা সময় হারান।',
      ],
      outcomes: [
        'পারচেজ রিসিভ, সাপ্লায়ার বকেয়া, রিটার্ন এবং পেমেন্ট হিস্ট্রির ভালো ভিজিবিলিটি।',
        'স্ট্রাকচার্ড স্টেটমেন্ট ও রেকর্ডের মাধ্যমে পরিষ্কার সাপ্লায়ার আলোচনা।',
        'শক্তিশালী স্টক ও ফাইন্যান্স নির্ভুলতা কারণ পারচেজ অ্যাক্টিভিটি উভয় দিকেই ফিড করে।',
      ],
    },
  },
  'due-collection': {
    relatedModules: ['retail-pos', 'dsr-dealer-management', 'accounting'],
    en: {
      painPoints: [
        'Teams collect money without a reliable transaction history behind each balance.',
        'Customer and shop statements are assembled manually during disputes.',
        'Managers cannot prioritize overdue follow-up based on clean ledger data.',
      ],
      outcomes: [
        'Clearer customer and shop balance follow-up from linked sales and payment records.',
        'Better accountability for field collection and in-shop due collection activity.',
        'Fewer collection errors caused by disconnected notes or verbal updates.',
      ],
    },
    bn: {
      painPoints: [
        'প্রতিটি ব্যালেন্সের পেছনে নির্ভরযোগ্য ট্রানজ্যাকশন হিস্ট্রি ছাড়াই টিম টাকা কালেক্ট করে।',
        'বিরোধের সময় কাস্টমার ও শপ স্টেটমেন্ট ম্যানুয়ালি তৈরি করা হয়।',
        'পরিষ্কার লেজার ডেটার ভিত্তিতে ম্যানেজাররা ওভারডিউ ফলো-আপ অগ্রাধিকার দিতে পারেন না।',
      ],
      outcomes: [
        'সংযুক্ত সেলস ও পেমেন্ট রেকর্ড থেকে পরিষ্কার কাস্টমার ও শপ ব্যালেন্স ফলো-আপ।',
        'ফিল্ড কালেকশন ও শপ-ভিতরের বকেয়া আদায় অ্যাক্টিভিটির জন্য ভালো জবাবদিহিতা।',
        'বিচ্ছিন্ন নোট বা মৌখিক আপডেটের কারণে কম কালেকশন ভুল।',
      ],
    },
  },
  'dsr-dealer-management': {
    relatedModules: ['due-collection', 'inventory-management', 'accounting'],
    en: {
      painPoints: [
        'Morning issue, returns, cash, and evening settlement are hard to reconcile across route teams.',
        'Managers depend on calls and handwritten notes to know what happened in the field.',
        'Shop dues and rep-level accountability become unclear after a few sales cycles.',
      ],
      outcomes: [
        'Better route-team control from issue to collection to settlement.',
        'Cleaner accountability for stock, cash, returns, and due balances per rep or route.',
        'More reliable dealer and distributor reporting without rebuilding the day manually.',
      ],
    },
    bn: {
      painPoints: [
        'রুট টিমগুলোতে মর্নিং ইস্যু, রিটার্ন, ক্যাশ এবং ইভিনিং সেটেলমেন্ট মেলানো কঠিন।',
        'ফিল্ডে কী ঘটেছে জানতে ম্যানেজাররা ফোন কল ও হাতে লেখা নোটের উপর নির্ভর করেন।',
        'কয়েকটি সেলস চক্রের পর শপ বকেয়া ও রেপ-লেভেল জবাবদিহিতা অস্পষ্ট হয়ে যায়।',
      ],
      outcomes: [
        'ইস্যু থেকে কালেকশন থেকে সেটেলমেন্ট পর্যন্ত ভালো রুট-টিম নিয়ন্ত্রণ।',
        'প্রতি রেপ বা রুটে স্টক, ক্যাশ, রিটার্ন এবং বকেয়া ব্যালেন্সের পরিষ্কার জবাবদিহিতা।',
        'দিন ম্যানুয়ালি পুনর্নির্মাণ ছাড়াই আরও নির্ভরযোগ্য ডিলার ও ডিস্ট্রিবিউটর রিপোর্টিং।',
      ],
    },
  },
  'installment-sales': {
    relatedModules: ['due-collection', 'reporting'],
    en: {
      painPoints: [
        'Installment schedules drift from the original sale and teams lose track of overdue payments.',
        'Guarantor and customer documentation is scattered across files and chat messages.',
        'Late fee handling and reschedules are inconsistent across customers.',
      ],
      outcomes: [
        'Better collection control through due schedules, overdue visibility, and customer statements.',
        'Stronger documentation around guarantors, supporting files, and credit settings.',
        'A more disciplined installment workflow from sale creation to final closure.',
      ],
    },
    bn: {
      painPoints: [
        'ইনস্টলমেন্ট শিডিউল মূল সেল থেকে সরে যায় এবং টিম ওভারডিউ পেমেন্টের হিসাব হারিয়ে ফেলে।',
        'গ্যারান্টর ও কাস্টমার ডকুমেন্টেশন ফাইল ও চ্যাট মেসেজে ছড়িয়ে থাকে।',
        'লেট ফি হ্যান্ডলিং ও রিশিডিউল কাস্টমারভেদে অসামঞ্জস্যপূর্ণ থাকে।',
      ],
      outcomes: [
        'বকেয়া শিডিউল, ওভারডিউ ভিজিবিলিটি এবং কাস্টমার স্টেটমেন্টের মাধ্যমে ভালো কালেকশন নিয়ন্ত্রণ।',
        'গ্যারান্টর, সাপোর্টিং ফাইল এবং ক্রেডিট সেটিংসের চারপাশে শক্তিশালী ডকুমেন্টেশন।',
        'সেল তৈরি থেকে ফাইনাল ক্লোজার পর্যন্ত আরও শৃঙ্খলাবদ্ধ ইনস্টলমেন্ট ওয়ার্কফ্লো।',
      ],
    },
  },
  reporting: {
    relatedModules: ['accounting', 'inventory-management', 'retail-pos'],
    en: {
      painPoints: [
        'Owners receive reports late because daily data has to be recompiled manually.',
        'Sales, stock, finance, HR, and collection reports do not agree with each other.',
        'Managers spend time hunting for the right number instead of acting on it.',
      ],
      outcomes: [
        'Quicker operational review using dashboards and reports tied to live workflows.',
        'Less debate over numbers because teams look at one connected record base.',
        'Better decision-making for stock, due, spending, and profit control.',
      ],
    },
    bn: {
      painPoints: [
        'দৈনিক ডেটা ম্যানুয়ালি পুনরায় কম্পাইল করতে হওয়ায় মালিকরা দেরিতে রিপোর্ট পান।',
        'সেলস, স্টক, ফাইন্যান্স, এইচআর এবং কালেকশন রিপোর্ট একে অপরের সাথে মেলে না।',
        'ম্যানেজাররা সঠিক সংখ্যার পেছনে খোঁজাখুঁজিতে সময় ব্যয় করেন, কাজ করার বদলে।',
      ],
      outcomes: [
        'লাইভ ওয়ার্কফ্লোর সাথে যুক্ত ড্যাশবোর্ড ও রিপোর্ট ব্যবহার করে দ্রুত অপারেশনাল রিভিউ।',
        'সংখ্যা নিয়ে কম বিতর্ক কারণ টিম একটি সংযুক্ত রেকর্ড বেস দেখে।',
        'স্টক, বকেয়া, খরচ এবং প্রফিট নিয়ন্ত্রণের জন্য ভালো সিদ্ধান্ত গ্রহণ।',
      ],
    },
  },
  'repair-warranty': {
    relatedModules: ['inventory-management', 'retail-pos'],
    en: {
      painPoints: [
        'Service counters lose track of product history, claims, and job status.',
        'Customers return with serial or warranty questions but records are incomplete.',
        'After-sales support is disconnected from the original product sale.',
      ],
      outcomes: [
        'Faster warranty lookup and job follow-up with better product history.',
        'Less dependence on paper slips for repair intake and status tracking.',
        'Better support quality for electronics, appliance, and service-oriented retailers.',
      ],
    },
    bn: {
      painPoints: [
        'সার্ভিস কাউন্টার প্রোডাক্ট হিস্ট্রি, ক্লেইম এবং জব স্ট্যাটাসের হিসাব হারিয়ে ফেলে।',
        'কাস্টমাররা সিরিয়াল বা ওয়ারেন্টি প্রশ্ন নিয়ে ফিরে আসেন কিন্তু রেকর্ড অসম্পূর্ণ থাকে।',
        'আফটার-সেলস সাপোর্ট মূল প্রোডাক্ট সেল থেকে বিচ্ছিন্ন থাকে।',
      ],
      outcomes: [
        'ভালো প্রোডাক্ট হিস্ট্রি সহ দ্রুত ওয়ারেন্টি লুকআপ ও জব ফলো-আপ।',
        'রিপেয়ার ইনটেক ও স্ট্যাটাস ট্র্যাকিংয়ের জন্য কাগজের স্লিপের উপর কম নির্ভরতা।',
        'ইলেকট্রনিক্স, অ্যাপ্লায়েন্স এবং সার্ভিস-কেন্দ্রিক রিটেইলারদের জন্য ভালো সাপোর্ট মান।',
      ],
    },
  },
  'retail-shop': {
    relatedModules: ['retail-pos', 'inventory-management', 'accounting'],
    en: {
      painPoints: [
        'A busy shop needs quick billing, but stock and due records still have to stay clean.',
        'Owners often discover margin, due, or purchase problems only after the day is over.',
        'Separate apps for POS, stock, accounts, and customer balance create daily friction.',
      ],
      outcomes: [
        'A cleaner retail routine from sale and receipt to stock update and day-end review.',
        'Better control of customer due, purchase activity, and expense visibility.',
        'A path to expand into accounting, HR, service, or installment workflows later.',
      ],
    },
    bn: {
      painPoints: [
        'একটি ব্যস্ত দোকানের দ্রুত বিলিং দরকার, কিন্তু স্টক ও বকেয়া রেকর্ড তখনও পরিষ্কার রাখতে হয়।',
        'মালিকরা প্রায়ই দিন শেষ হওয়ার পরই মার্জিন, বকেয়া বা পারচেজ সমস্যা আবিষ্কার করেন।',
        'পিওএস, স্টক, অ্যাকাউন্টস এবং কাস্টমার ব্যালেন্সের জন্য আলাদা অ্যাপ দৈনিক ঘর্ষণ তৈরি করে।',
      ],
      outcomes: [
        'সেল ও রিসিট থেকে স্টক আপডেট এবং দিনশেষ রিভিউ পর্যন্ত একটি পরিষ্কার রিটেইল রুটিন।',
        'কাস্টমার বকেয়া, পারচেজ অ্যাক্টিভিটি এবং খরচ ভিজিবিলিটির ভালো নিয়ন্ত্রণ।',
        'পরে অ্যাকাউন্টিং, এইচআর, সার্ভিস বা ইনস্টলমেন্ট ওয়ার্কফ্লোতে সম্প্রসারণের পথ।',
      ],
    },
  },
  'wholesale-business': {
    relatedModules: ['purchase-management', 'due-collection', 'reporting'],
    en: {
      painPoints: [
        'Wholesale businesses juggle supplier balances, customer dues, and stock movement at the same time.',
        'Large invoice volume makes manual reconciliation too slow.',
        'Cash gets tied up in stock and receivables without enough visibility.',
      ],
      outcomes: [
        'Better control of invoice, purchase, supplier, and customer balance workflows.',
        'Clearer buying and collection decisions from connected reports.',
        'Stronger financial visibility for a business with both payables and receivables.',
      ],
    },
    bn: {
      painPoints: [
        'হোলসেল ব্যবসা একসাথে সাপ্লায়ার ব্যালেন্স, কাস্টমার বকেয়া এবং স্টক মুভমেন্ট সামলায়।',
        'বড় ইনভয়েস ভলিউম ম্যানুয়াল রিকনসিলিয়েশনকে অনেক ধীর করে দেয়।',
        'পর্যাপ্ত ভিজিবিলিটি ছাড়াই স্টক ও প্রাপ্যে টাকা আটকে যায়।',
      ],
      outcomes: [
        'ইনভয়েস, পারচেজ, সাপ্লায়ার এবং কাস্টমার ব্যালেন্স ওয়ার্কফ্লোর ভালো নিয়ন্ত্রণ।',
        'সংযুক্ত রিপোর্ট থেকে পরিষ্কার ক্রয় ও কালেকশন সিদ্ধান্ত।',
        'দেয় ও প্রাপ্য উভয় থাকা ব্যবসার জন্য শক্তিশালী ফাইন্যান্সিয়াল ভিজিবিলিটি।',
      ],
    },
  },
  'dealer-distributor': {
    relatedModules: ['dsr-dealer-management', 'due-collection', 'accounting'],
    en: {
      painPoints: [
        'Stock leaves the warehouse through routes, reps, and shops, but settlement clarity comes late.',
        'Cash, returns, and due records become inconsistent across the field and office.',
        'Management cannot quickly compare issued stock against actual route outcomes.',
      ],
      outcomes: [
        'Better distributor control across stock issue, route activity, collection, and settlement.',
        'Cleaner shop and field-team accountability with less manual follow-up.',
        'More reliable reporting for dealer, route, and collection operations.',
      ],
    },
    bn: {
      painPoints: [
        'স্টক রুট, রেপ এবং শপের মাধ্যমে ওয়্যারহাউস ছেড়ে যায়, কিন্তু সেটেলমেন্ট স্বচ্ছতা দেরিতে আসে।',
        'ফিল্ড ও অফিসে ক্যাশ, রিটার্ন এবং বকেয়া রেকর্ড অসামঞ্জস্যপূর্ণ হয়ে যায়।',
        'ম্যানেজমেন্ট দ্রুত ইস্যুকৃত স্টককে প্রকৃত রুট ফলাফলের সাথে তুলনা করতে পারে না।',
      ],
      outcomes: [
        'স্টক ইস্যু, রুট অ্যাক্টিভিটি, কালেকশন এবং সেটেলমেন্ট জুড়ে ভালো ডিস্ট্রিবিউটর নিয়ন্ত্রণ।',
        'কম ম্যানুয়াল ফলো-আপ সহ পরিষ্কার শপ ও ফিল্ড-টিম জবাবদিহিতা।',
        'ডিলার, রুট এবং কালেকশন অপারেশনের জন্য আরও নির্ভরযোগ্য রিপোর্টিং।',
      ],
    },
  },
  'dsr-sales-team': {
    relatedModules: ['dsr-dealer-management', 'due-collection', 'reporting'],
    en: {
      painPoints: [
        'Field reps manage stock, cash, and customer balance changes outside the office all day.',
        'Managers need route-level accountability without waiting for manual updates.',
        'Collection and return activity is easy to lose when the workflow is informal.',
      ],
      outcomes: [
        'Stronger rep-level accountability from issue through settlement.',
        'Cleaner visibility into route sales, route cash, route dues, and returns.',
        'Less dependency on memory, calls, and handwritten updates.',
      ],
    },
    bn: {
      painPoints: [
        'ফিল্ড রেপরা সারাদিন অফিসের বাইরে স্টক, ক্যাশ এবং কাস্টমার ব্যালেন্স পরিবর্তন ম্যানেজ করেন।',
        'ম্যানেজমেন্টের ম্যানুয়াল আপডেটের জন্য অপেক্ষা না করে রুট-লেভেল জবাবদিহিতা দরকার।',
        'ওয়ার্কফ্লো অনানুষ্ঠানিক হলে কালেকশন ও রিটার্ন অ্যাক্টিভিটি সহজেই হারিয়ে যায়।',
      ],
      outcomes: [
        'ইস্যু থেকে সেটেলমেন্ট পর্যন্ত শক্তিশালী রেপ-লেভেল জবাবদিহিতা।',
        'রুট সেলস, রুট ক্যাশ, রুট বকেয়া এবং রিটার্নের পরিষ্কার ভিজিবিলিটি।',
        'স্মৃতি, ফোন কল এবং হাতে লেখা আপডেটের উপর কম নির্ভরতা।',
      ],
    },
  },
  pharmacy: {
    relatedModules: ['inventory-management', 'purchase-management', 'accounting'],
    en: {
      painPoints: [
        'Medicine retail requires product, supplier, sales, and daily cash control at the same time.',
        'Purchase and supplier records need to stay traceable as stock changes quickly.',
        'Owners want more than billing; they need cleaner daily operating numbers.',
      ],
      outcomes: [
        'Better visibility into medicine stock, supplier history, due, and expenses.',
        'A more organized pharmacy workflow from purchase receive to sale and reporting.',
        'Stronger operational review for owners managing sales and accounts together.',
      ],
    },
    bn: {
      painPoints: [
        'মেডিসিন রিটেইলে একই সাথে প্রোডাক্ট, সাপ্লায়ার, সেলস এবং দৈনিক ক্যাশ নিয়ন্ত্রণ দরকার।',
        'স্টক দ্রুত পরিবর্তন হওয়ায় পারচেজ ও সাপ্লায়ার রেকর্ড ট্রেসেবল থাকা দরকার।',
        'মালিকরা শুধু বিলিংয়ের চেয়ে বেশি চান; তাদের পরিষ্কার দৈনিক অপারেটিং সংখ্যা দরকার।',
      ],
      outcomes: [
        'মেডিসিন স্টক, সাপ্লায়ার হিস্ট্রি, বকেয়া এবং খরচের ভালো ভিজিবিলিটি।',
        'পারচেজ রিসিভ থেকে সেল ও রিপোর্টিং পর্যন্ত আরও গোছানো ফার্মেসি ওয়ার্কফ্লো।',
        'সেলস ও অ্যাকাউন্টস একসাথে ম্যানেজ করা মালিকদের জন্য শক্তিশালী অপারেশনাল রিভিউ।',
      ],
    },
  },
  'grocery-store': {
    relatedModules: ['retail-pos', 'inventory-management', 'due-collection'],
    en: {
      painPoints: [
        'Fast daily transactions create end-of-day confusion when stock and cash are reviewed manually.',
        'Small but frequent purchases and customer dues are easy to lose track of.',
        'Owners need a simple system first, not a heavy rollout that stalls the team.',
      ],
      outcomes: [
        'Cleaner sales, stock, purchase, and due control for a busy grocery operation.',
        'Better day-end clarity around cash, sales, and customer balances.',
        'A simple starting point that can expand as the shop grows.',
      ],
    },
    bn: {
      painPoints: [
        'স্টক ও ক্যাশ ম্যানুয়ালি রিভিউ করলে দ্রুত দৈনিক ট্রানজ্যাকশন দিনশেষে বিভ্রান্তি তৈরি করে।',
        'ছোট কিন্তু ঘন ঘন পারচেজ এবং কাস্টমার বকেয়ার হিসাব রাখা কঠিন হয়ে যায়।',
        'মালিকদের প্রথমে একটি সহজ সিস্টেম দরকার, এমন ভারী রোলআউট নয় যা টিমকে থামিয়ে দেয়।',
      ],
      outcomes: [
        'একটি ব্যস্ত গ্রোসারি অপারেশনের জন্য পরিষ্কার সেলস, স্টক, পারচেজ এবং বকেয়া নিয়ন্ত্রণ।',
        'ক্যাশ, সেলস এবং কাস্টমার ব্যালেন্স নিয়ে ভালো দিনশেষ স্বচ্ছতা।',
        'একটি সহজ শুরুর পয়েন্ট যা দোকান বাড়ার সাথে সাথে সম্প্রসারিত হতে পারে।',
      ],
    },
  },
};

function PageCard({ page, basePath, Icon, language }) {
  return (
    <Link to={buildLocalizedPath(language, `${basePath}/${page.slug}`)} className="group rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_44px_rgba(15,23,42,0.06)] transition duration-200 hover:-translate-y-1 hover:border-[var(--brand)]/30 hover:shadow-[0_22px_56px_rgba(15,23,42,0.1)]">
      <div className="overflow-hidden rounded-2xl">
        <ImagePlaceholder data={{ src: page.image, alt: page.imageAlt }} heightClass="aspect-[16/10]" fit="cover" position="center" />
      </div>
      <div className="mt-5 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand-strong)]">
          <Icon size={20} />
        </span>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--brand)]">{page.eyebrow}</p>
          <h3 className="mt-1 text-lg font-black leading-snug text-slate-950">{page.title}</h3>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{page.description}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {page.keywords.map((keyword) => (
          <span key={keyword} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{keyword}</span>
        ))}
      </div>
    </Link>
  );
}

function HubPage({ type }) {
  const { language, setLanguage, t } = usePublicLanguage();
  usePublicPageEffects();

  const isFeatures = type === 'features';
  const pages = isFeatures ? featurePages.map((page) => getFeaturePage(page.slug, language)) : solutionPages.map((page) => getSolutionPage(page.slug, language));
  const icons = isFeatures ? featureIcons : solutionIcons;
  const title = isFeatures ? t('seoContent.hub.featuresTitle') : t('seoContent.hub.solutionsTitle');
  const description = isFeatures ? t('seoContent.hub.featuresDescription') : t('seoContent.hub.solutionsDescription');

  return (
    <main id="top" className="landing-page">
      <LandingHeader language={language} setLanguage={setLanguage} t={t} />
      <section className="public-hero">
        <div className="landing-container relative">
          <Link to={buildLocalizedPath(language, '/landing')} className="public-hero-breadcrumb">{t('seoContent.breadcrumbHome')}</Link>
          <div className="mt-6 max-w-3xl">
            <p className="landing-eyebrow">{isFeatures ? t('seoContent.hub.featuresEyebrow') : t('seoContent.hub.solutionsEyebrow')}</p>
            <h1 className="public-hero-title">{title}</h1>
            <p className="public-hero-text">{description}</p>
          </div>
        </div>
      </section>

      <section className="landing-section landing-section-soft">
        <div className="landing-container">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {pages.map((page) => {
              const Icon = icons[page.slug] || CheckCircle2;
              return <PageCard key={page.slug} page={page} basePath={isFeatures ? '/features' : '/solutions'} Icon={Icon} language={language} />;
            })}
          </div>

          <div className="mt-8 rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_44px_rgba(15,23,42,0.06)] sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--brand)]">{t('seoContent.hub.howToUseLabel')}</p>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">{t('seoContent.hub.howToUseTitle')}</h2>
            <p className="mt-3 text-[15px] font-medium leading-7 text-slate-600">{t('seoContent.hub.howToUseBody1')}</p>
            <p className="mt-4 text-[15px] font-medium leading-7 text-slate-600">{t('seoContent.hub.howToUseBody2')}</p>
          </div>
        </div>
      </section>

      <LandingFooter t={t} language={language} />
      <DeferredLandingAiChatWidget t={t} />
    </main>
  );
}

function getRotatingRelatedPages(pages, currentSlug, count = 3) {
  const currentIndex = pages.findIndex((candidate) => candidate.slug === currentSlug);
  if (currentIndex === -1) {
    return pages.slice(0, count);
  }

  const ordered = [
    ...pages.slice(currentIndex + 1),
    ...pages.slice(0, currentIndex),
  ];

  return ordered.slice(0, count);
}

function getDefaultSupport(page, t) {
  return {
    painPoints: [
      t('seoContent.detail.defaultPainPoint1', { eyebrow: page.eyebrow }),
      t('seoContent.detail.defaultPainPoint2'),
      t('seoContent.detail.defaultPainPoint3', { eyebrow: page.eyebrow }),
    ],
    outcomes: [
      t('seoContent.detail.defaultOutcome1', { eyebrow: page.eyebrow }),
      t('seoContent.detail.defaultOutcome2'),
      t('seoContent.detail.defaultOutcome3'),
    ],
    relatedModules: [],
  };
}

function DetailPage({ type }) {
  const { slug } = useParams();
  const { language, setLanguage, t } = usePublicLanguage();
  usePublicPageEffects();

  const isFeature = type === 'feature';
  const page = isFeature ? getFeaturePage(slug, language) : getSolutionPage(slug, language);
  const relatedPages = (isFeature ? featurePages : solutionPages).map((entry) => (isFeature ? getFeaturePage(entry.slug, language) : getSolutionPage(entry.slug, language)));
  const icons = isFeature ? featureIcons : solutionIcons;

  if (!page) {
    return <Navigate to={buildLocalizedPath(language, isFeature ? '/features' : '/solutions')} replace />;
  }

  const Icon = icons[page.slug] || CheckCircle2;
  const sections = page.sections;
  const faqs = page.faqs;
  const supportEntry = pageSupport[page.slug];
  const support = supportEntry ? { ...(supportEntry[language] || supportEntry.en), relatedModules: supportEntry.relatedModules } : getDefaultSupport(page, t);
  const linkedModules = support.relatedModules
    .map((moduleSlug) => getFeaturePage(moduleSlug, language) || getSolutionPage(moduleSlug, language))
    .filter(Boolean);

  return (
    <main id="top" className="landing-page">
      <LandingHeader language={language} setLanguage={setLanguage} t={t} />

      <section className="public-hero">
        <div className="landing-container grid items-center gap-10 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <div className="public-hero-breadcrumbs">
              <Link to={buildLocalizedPath(language, '/landing')}>{t('seoContent.breadcrumbHome')}</Link>
              <span>/</span>
              <Link to={buildLocalizedPath(language, isFeature ? '/features' : '/solutions')}>{isFeature ? t('seoContent.breadcrumbFeatures') : t('seoContent.breadcrumbSolutions')}</Link>
            </div>
            <div className="mt-6 max-w-3xl">
              <p className="landing-eyebrow">{page.eyebrow}</p>
              <h1 className="public-hero-title">{page.title}</h1>
              <p className="public-hero-text">{page.description}</p>
            </div>
            <div className="mt-7 flex flex-wrap gap-2">
              {page.keywords.map((keyword) => (
                <span key={keyword} className="public-hero-chip">{keyword}</span>
              ))}
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href={whatsappUrl} target="_blank" rel="noreferrer" className="landing-primary-btn px-6 text-sm">
                <MessageCircle size={17} />
                {t('seoContent.detail.bookDemo')}
              </a>
              <Link to={buildLocalizedPath(language, '/pricing')} className="landing-secondary-btn px-6 text-sm">
                {t('seoContent.detail.seePricing')}
                <ArrowRight size={17} />
              </Link>
            </div>
          </div>
          <div className="public-hero-panel p-3">
            <ImagePlaceholder data={{ src: page.image, alt: page.imageAlt }} heightClass="aspect-[16/10]" fit="cover" position="center" />
          </div>
        </div>
      </section>

      <section className="landing-section landing-section-soft">
        <div className="landing-container grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--brand-soft)] text-[var(--brand-strong)]">
                <Icon size={24} />
              </div>
              <h2 className="mt-5 text-2xl font-black text-slate-950">{t('seoContent.detail.bestFitFor')}</h2>
              <p className="mt-3 text-sm font-medium leading-6 text-slate-600">{page.fit || t('seoContent.detail.defaultFit')}</p>
              <div className="mt-5 space-y-3">
                {page.keywords.map((keyword) => (
                  <p key={keyword} className="flex items-center gap-3 text-sm font-bold text-slate-700">
                    <CheckCircle2 size={17} className="text-[var(--landing-accent-success)]" />
                    {keyword}
                  </p>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
              <h2 className="text-xl font-black text-slate-950">{t('seoContent.detail.painPointsTitle')}</h2>
              <div className="mt-4 space-y-3">
                {support.painPoints.map((item) => (
                  <p key={item} className="flex items-start gap-3 text-sm font-medium leading-6 text-slate-600">
                    <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-[var(--brand)]" />
                    {item}
                  </p>
                ))}
              </div>
            </div>
          </aside>

          <div className="space-y-5">
            {sections.map((section) => (
              <article key={section.title} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
                <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[var(--brand)]">
                  <Clock size={14} />
                  {t('seoContent.detail.workflowLabel')}
                </p>
                <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">{section.title}</h2>
                <p className="mt-3 text-[15px] font-medium leading-7 text-slate-600">{section.body}</p>
              </article>
            ))}

            <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[var(--brand)]">
                <Clock size={14} />
                {t('seoContent.detail.buyingGuideLabel')}
              </p>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">{t('seoContent.detail.buyingGuideTitle')}</h2>
              <p className="mt-3 text-[15px] font-medium leading-7 text-slate-600">
                {t('seoContent.detail.buyingGuideBody1', { eyebrow: page.eyebrow })}
              </p>
              <p className="mt-4 text-[15px] font-medium leading-7 text-slate-600">
                {t('seoContent.detail.buyingGuideBody2')}
              </p>
            </article>

            <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[var(--brand)]">
                <Clock size={14} />
                {t('seoContent.detail.outcomesLabel')}
              </p>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">{t('seoContent.detail.outcomesTitle')}</h2>
              <div className="mt-4 space-y-3">
                {support.outcomes.map((item) => (
                  <p key={item} className="flex items-start gap-3 text-[15px] font-medium leading-7 text-slate-600">
                    <CheckCircle2 size={18} className="mt-1 shrink-0 text-[var(--landing-accent-success)]" />
                    {item}
                  </p>
                ))}
              </div>
            </article>

            <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[var(--brand)]">
                <Clock size={14} />
                {t('seoContent.detail.connectedLabel')}
              </p>
              <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">{t('seoContent.detail.connectedTitle')}</h2>
              <p className="mt-3 text-[15px] font-medium leading-7 text-slate-600">
                {t('seoContent.detail.connectedBody', { eyebrow: page.eyebrow })}
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {linkedModules.map((related) => {
                  const href = featurePages.some((feature) => feature.slug === related.slug) ? `/features/${related.slug}` : `/solutions/${related.slug}`;
                  return (
                    <Link key={related.slug} to={buildLocalizedPath(language, href)} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-[var(--brand)]/25 hover:bg-white">
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--brand)]">{related.eyebrow}</p>
                      <p className="mt-2 text-sm font-bold leading-6 text-slate-900">{related.title}</p>
                    </Link>
                  );
                })}
              </div>
            </article>

            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_12px_36px_rgba(15,23,42,0.05)]">
              <h2 className="text-2xl font-black tracking-tight text-slate-950">{t('seoContent.detail.faqTitle')}</h2>
              <div className="mt-5 divide-y divide-slate-100">
                {faqs.map(([question, answer]) => (
                  <div key={question} className="py-4 first:pt-0 last:pb-0">
                    <h3 className="text-base font-black text-slate-950">{question}</h3>
                    <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{answer}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </section>

      <section className="landing-section landing-section-brand">
        <div className="landing-container">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="landing-eyebrow">{t('seoContent.detail.exploreMore')}</p>
              <h2 className="landing-section-title">{isFeature ? t('seoContent.detail.relatedFeatures') : t('seoContent.detail.relatedSolutions')}</h2>
              <p className="landing-section-text">{t('seoContent.detail.relatedText')}</p>
            </div>
            <Link to={buildLocalizedPath(language, isFeature ? '/features' : '/solutions')} className="inline-flex items-center gap-2 text-sm font-black text-[var(--brand)] transition hover:gap-3">
              {t('seoContent.detail.viewAll')}
              <ArrowRight size={16} />
            </Link>
          </div>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {getRotatingRelatedPages(relatedPages, page.slug).map((related) => {
              const RelatedIcon = icons[related.slug] || CheckCircle2;
              return <PageCard key={related.slug} page={related} basePath={isFeature ? '/features' : '/solutions'} Icon={RelatedIcon} language={language} />;
            })}
          </div>
        </div>
      </section>

      <LandingFooter t={t} language={language} />
      <DeferredLandingAiChatWidget t={t} />
    </main>
  );
}

export function FeatureHubPage() {
  return <HubPage type="features" />;
}

export function SolutionHubPage() {
  return <HubPage type="solutions" />;
}

export function FeatureDetailPage() {
  return <DetailPage type="feature" />;
}

export function SolutionDetailPage() {
  return <DetailPage type="solution" />;
}

