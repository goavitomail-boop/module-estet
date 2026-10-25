import { RevealText } from "../RevealText";
import { AssemblyWindow, type AssemblyItem } from "./AssemblyWindow";
import s from "./LiveAssembly.module.css";

export function LiveAssembly({ items }: { items: AssemblyItem[] }) {
  return (
    <section id="live" className={s.section} aria-labelledby="live-title">
      <div className={`container ${s.grid}`}>
        <div className={s.text}>
          <RevealText id="live-title" className={s.title}>
            Выберите сферу — сайт соберётся на глазах
          </RevealText>
          <p className={s.sub}>
            Это настоящие шаблоны. Так будет выглядеть первый вариант вашего сайта — с вашим названием, услугами и
            ценами.
          </p>
        </div>
        <AssemblyWindow items={items} />
      </div>
    </section>
  );
}
