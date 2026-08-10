"use client";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

const entries = [
  ["Как получить задание?", "Пройди короткий опрос — после него мы покажем задания, которые тебе доступны. Открой карточку и следуй указанным условиям."],
  ["Почему мне доступны не все задания?", "Доступность зависит от ответов в опросе и условий партнёров. Мы показываем только подходящие варианты."],
  ["Почему задание пропало?", "Задание может быть скрыто после проверки или когда условия партнёра изменились. Напиши в поддержку, если нужна помощь."],
  ["Что делать после выполнения?", "Следуй инструкции в карточке задания. Для карты Т-Банк после выполнения условий напиши менеджеру."],
  ["Как получить выплату?", "Выплата происходит согласно условиям конкретного задания после подтверждения выполнения."],
  ["Что делать, если у меня уже есть карта Т-Банк?", "Мы не показываем это задание, если карта уже есть. Посмотри другие доступные предложения."],
  ["Что делать, если у меня уже есть ИП или НПД?", "Не закрывай существующее ИП самостоятельно. Напиши менеджеру — он подскажет дальнейшие действия для твоей ситуации."],
];
export function Faq() { const [active, setActive] = useState<number | null>(null); return <section className="faq-section" aria-labelledby="faq-title"><div className="section-heading"><span className="eyebrow">ПОМОЩЬ</span><h2 id="faq-title">Частые вопросы</h2></div>{entries.map(([question, answer], index) => <article className="faq-item" key={question}><button onClick={() => setActive(active === index ? null : index)} aria-expanded={active === index}>{question}<ChevronDown className={active === index ? "rotate" : ""} size={18} /></button>{active === index && <p>{answer}</p>}</article>)}</section>; }
