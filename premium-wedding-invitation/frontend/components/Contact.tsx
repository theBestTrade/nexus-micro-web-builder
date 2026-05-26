
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, MessageCircle, ChevronDown, Copy, Check, Flower2, ExternalLink } from 'lucide-react';
import { WeddingData } from '../types';
import { WREATH_URL } from '../constants';

interface ContactProps {
  data: WeddingData;
}

const Contact: React.FC<ContactProps> = ({ data }) => {
  const [openSection, setOpenSection] = useState<'groom' | 'bride' | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const PersonRow = ({ name, phone, role }: { name: string, phone: string, role: string }) => (
    <div className="flex items-center justify-between py-3 border-b border-stone-100 last:border-0">
      <div className="flex items-center gap-3">
        <span className="text-xs text-stone-400 w-12">{role}</span>
        <span className="text-sm font-medium text-stone-700">{name}</span>
      </div>
      <div className="flex gap-2">
        <a href={`tel:${phone}`} className="p-2 text-stone-400 hover:text-pink-400 transition-colors">
          <Phone size={18} />
        </a>
        <a href={`sms:${phone}`} className="p-2 text-stone-400 hover:text-pink-400 transition-colors">
          <MessageCircle size={18} />
        </a>
      </div>
    </div>
  );

  const AccountBox = ({ bank, account, name }: { bank: string, account: string, name: string }) => (
    <div className="bg-white p-4 rounded-xl border border-stone-100 shadow-sm mb-3">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-medium text-stone-400">{bank}</span>
        <button 
          onClick={() => copyToClipboard(account, account)}
          className="flex items-center gap-1 text-[10px] text-pink-400 font-medium uppercase tracking-tighter"
        >
          {copied === account ? <Check size={12} /> : <Copy size={12} />}
          {copied === account ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="flex justify-between items-end">
        <span className="text-sm text-stone-700 font-mono">{account}</span>
        <span className="text-xs text-stone-500">{name}</span>
      </div>
    </div>
  );

  const WreathButton = ({ side }: { side: string }) => (
    <motion.a
      href={WREATH_URL}
      target="_blank"
      rel="noopener noreferrer"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="mt-4 w-full flex items-center justify-center gap-3 py-4 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-700 font-medium text-sm shadow-sm hover:bg-emerald-100 transition-colors"
    >
      <Flower2 size={20} className="text-emerald-500" />
      <span>{side}측 축하 화환 보내기</span>
      <ExternalLink size={14} className="opacity-50" />
    </motion.a>
  );

  return (
    <section className="px-8">
      <div className="text-center mb-10">
        <h2 className="font-serif italic text-2xl text-stone-700 tracking-widest">Contact</h2>
        <p className="text-[10px] text-stone-400 uppercase tracking-[0.2em] mt-2">마음 전하실 곳</p>
      </div>

      <div className="space-y-4">
        {/* Groom Section */}
        <div className="border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
          <button 
            onClick={() => setOpenSection(openSection === 'groom' ? null : 'groom')}
            className="w-full flex items-center justify-between p-5 bg-stone-50 text-stone-700"
          >
            <span className="font-medium">신랑측 마음 전하실 곳</span>
            <ChevronDown className={`transition-transform ${openSection === 'groom' ? 'rotate-180' : ''}`} size={20} />
          </button>
          <AnimatePresence>
            {openSection === 'groom' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-5 pb-5 bg-stone-50"
              >
                <div className="mb-6">
                  <PersonRow name={data.groom.name} phone={data.groom.phone} role="신랑" />
                  <PersonRow name={data.groom.father} phone="010-0000-0000" role="혼주(부)" />
                  <PersonRow name={data.groom.mother} phone="010-0000-0000" role="혼주(모)" />
                </div>
                <AccountBox bank={data.groom.bank} account={data.groom.account} name={data.groom.name} />
                <WreathButton side="신랑" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bride Section */}
        <div className="border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
          <button 
            onClick={() => setOpenSection(openSection === 'bride' ? null : 'bride')}
            className="w-full flex items-center justify-between p-5 bg-stone-50 text-stone-700"
          >
            <span className="font-medium">신부측 마음 전하실 곳</span>
            <ChevronDown className={`transition-transform ${openSection === 'bride' ? 'rotate-180' : ''}`} size={20} />
          </button>
          <AnimatePresence>
            {openSection === 'bride' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-5 pb-5 bg-stone-50"
              >
                <div className="mb-6">
                  <PersonRow name={data.bride.name} phone={data.bride.phone} role="신부" />
                  <PersonRow name={data.bride.father} phone="010-0000-0000" role="혼주(부)" />
                  <PersonRow name={data.bride.mother} phone="010-0000-0000" role="혼주(모)" />
                </div>
                <AccountBox bank={data.bride.bank} account={data.bride.account} name={data.bride.name} />
                <WreathButton side="신부" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export default Contact;
