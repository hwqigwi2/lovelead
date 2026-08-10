import Image from "next/image";

export function LoadingScreen() {
  return <main className="loading-screen" aria-label="Загрузка LoveLead"><div className="liquid-orb" /><div className="loading-glass"><Image src="/logo.png" alt="LoveLead" width={148} height={99} priority /><span>Подбираем задания</span></div></main>;
}
