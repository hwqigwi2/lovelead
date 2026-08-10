"use client";
import Image from "next/image";
import { motion } from "framer-motion";

const reviews = [1, 2, 3, 4, 5, 6];
export function Reviews() { return <section className="reviews-section" aria-labelledby="reviews-title"><div className="section-heading"><span className="eyebrow">ОТЗЫВЫ</span><h2 id="reviews-title">Результаты наших пользователей</h2></div><div className="reviews-grid">{reviews.map((review, index) => <motion.figure key={review} className="review-frame" initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ delay: index * 0.04 }}><Image src={`/reviews/${review}.jpg`} alt={`Отзыв пользователя ${review}`} width={700} height={1280} sizes="(max-width: 700px) 76vw, 270px" /></motion.figure>)}</div></section>; }
