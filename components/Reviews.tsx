"use client";
import { ArrowUpRight, Star } from "lucide-react";
import { appConfig } from "@/lib/config";
import { openSmartLink } from "@/components/telegram";

const demoReviews = [
  { name: "Артём К.", text: "Сначала немного сомневался, но всё оказалось довольно понятно. Задание выполнил без проблем, дальше уже менеджер всё объяснил." },
  { name: "Екатерина Ю.", text: "Понравилось, что всё расписано нормально и не пришлось долго разбираться. По шагам прошлась и всё получилось." },
  { name: "Максим В.", text: "Удобно, что все задания собраны в одном месте. Выбрал подходящее, перешёл дальше и спокойно всё оформил." },
  { name: "Алина С.", text: "Сначала вообще не поняла как это работает, но потом разобралась буквально за несколько минут. Интерфейс удобный." },
  { name: "Дмитрий П.", text: "Нормальный вариант подработки. Самое главное, что условия задания написаны заранее и понятно, что нужно делать." },
  { name: "Мария К.", text: "Мне понравилось, что не нужно искать всё по разным каналам. Открыла приложение, посмотрела доступные варианты и выбрала нужный." },
  { name: "Илья Р.", text: "Всё достаточно просто. Посмотрел условия, сделал что требовалось и написал менеджеру после выполнения." },
  { name: "Полина М.", text: "Думала, что будет намного сложнее. В итоге всё оказалось проще, чем ожидала, главное внимательно читать условия." },
  { name: "Алексей Т.", text: "Удобное приложение, задания отображаются сразу и не надо каждый раз искать информацию вручную." },
  { name: "Виктория Н.", text: "Мне понравился сам формат. Сразу видно, какие задания доступны и сколько примерно времени займёт выполнение." },
  { name: "Роман Л.", text: "Разобрался быстро. Если внимательно читать условия, вообще никаких проблем не возникло." },
  { name: "Дарья В.", text: "Всё понятно и без лишней информации. Выбрала задание, посмотрела условия и дальше уже действовала по инструкции." },
];

const stars = [1, 2, 3, 4, 5];

export function Reviews() {
  return <section className="reviews-section" aria-labelledby="reviews-title"><div className="section-heading"><span className="eyebrow">ПРИМЕРЫ ОТЗЫВОВ</span><h2 id="reviews-title">Примеры отзывов пользователей</h2></div><div className="reviews-carousel">{demoReviews.map((review) => <article key={review.name} className="review-card"><h3 className="review-name">{review.name}</h3><div className="review-stars" aria-label="Оценка 5 из 5">{stars.map((star) => <Star key={star} size={14} fill="currentColor" strokeWidth={0} />)}</div><p className="review-text">{review.text}</p></article>)}</div><button className="reviews-more" onClick={() => openSmartLink(appConfig.reviewsTelegramUrl)}><span>Больше отзывов в Telegram</span><ArrowUpRight size={17} /></button></section>;
}
