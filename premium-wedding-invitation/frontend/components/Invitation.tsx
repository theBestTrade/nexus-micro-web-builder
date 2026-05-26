
import React from 'react';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { WeddingData } from '../types';

interface InvitationProps {
  data: WeddingData;
}

const Invitation: React.FC<InvitationProps> = ({ data }) => {
  return (
    <section className="px-8 pt-20 text-center">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="flex justify-center mb-8">
          <Heart className="text-pink-200 fill-pink-200" size={24} />
        </div>
        
        <h2 className="font-serif italic text-2xl text-stone-700 mb-10 tracking-widest">
          Invitation
        </h2>

        <div className="space-y-6 text-stone-600 leading-relaxed font-light text-sm md:text-base">
          {data.message.split('. ').map((sentence, idx) => (
            <p key={idx}>{sentence}.</p>
          ))}
        </div>

        <div className="mt-16 space-y-4">
          <div className="flex items-center justify-center gap-4 text-stone-700">
            <span className="font-medium">{data.groom.father} · {data.groom.mother}</span>
            <span className="text-stone-300 text-xs">의 차남</span>
            <span className="font-semibold text-lg">{data.groom.name}</span>
          </div>
          <div className="flex items-center justify-center gap-4 text-stone-700">
            <span className="font-medium">{data.bride.father} · {data.bride.mother}</span>
            <span className="text-stone-300 text-xs">의 장녀</span>
            <span className="font-semibold text-lg">{data.bride.name}</span>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default Invitation;
