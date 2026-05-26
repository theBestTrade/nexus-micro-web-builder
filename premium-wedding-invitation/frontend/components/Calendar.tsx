
import React from 'react';
import { motion } from 'framer-motion';

interface CalendarProps {
  date: string;
}

/**
 * Calendar 컴포넌트: 예식 날짜 강조 원의 크기를 2/3로 줄여 가독성 확보
 */
const Calendar: React.FC<CalendarProps> = ({ date }) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth();
  const day = d.getDate();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  
  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  return (
    <section className="px-8">
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        className="bg-stone-50 rounded-3xl p-8 border border-stone-100 shadow-sm"
      >
        <div className="text-center mb-8">
          <h3 className="font-serif text-xl text-stone-700 mb-1">
            {year}. {month + 1}
          </h3>
          <p className="text-stone-400 text-[10px] tracking-[0.2em] uppercase">Wedding Day</p>
        </div>

        <div className="grid grid-cols-7 gap-y-5 text-center">
          {weekDays.map((wd, i) => (
            <div key={wd} className={`text-[10px] font-bold ${i === 0 ? 'text-red-400' : 'text-stone-300'}`}>
              {wd}
            </div>
          ))}
          {calendarDays.map((dNum, idx) => {
            const isWeddingDay = dNum === day;
            return (
              <div 
                key={idx} 
                className={`relative text-sm py-2 flex flex-col items-center justify-center h-10 w-full ${isWeddingDay ? 'text-white font-bold' : 'text-stone-600'} ${idx % 7 === 0 ? 'text-red-400' : ''}`}
              >
                {isWeddingDay && (
                  <>
                    {/* 원의 크기를 2/3 수준(scale-65)으로 축소 */}
                    <motion.div 
                      layoutId="activeDay"
                      className="absolute inset-0 bg-pink-500 rounded-full z-0 scale-[0.65] shadow-lg shadow-pink-100"
                    />
                    <span className="absolute -bottom-6 text-[10px] text-pink-600 font-bold whitespace-nowrap">결혼식날</span>
                  </>
                )}
                <span className={`relative z-10 ${isWeddingDay ? 'text-white' : ''}`}>{dNum}</span>
              </div>
            );
          })}
        </div>

        <div className="mt-16 pt-8 border-t border-stone-200 text-center">
          <p className="text-stone-500 text-xs font-light leading-relaxed">
            저희의 소중한 시작을 함께해주셔서 감사합니다.<br/>
            <span className="text-pink-600 font-bold mt-1 inline-block">2026년 5월 3일 일요일 오후 12시</span>
          </p>
        </div>
      </motion.div>
    </section>
  );
};

export default Calendar;
