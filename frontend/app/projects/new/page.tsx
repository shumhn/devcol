import ProjectCreate from '@/app/components/ProjectCreate';
import { Space_Grotesk, Sora } from 'next/font/google';

const Display = Space_Grotesk({ subsets: ['latin'], weight: ['700'] });
const Premium = Sora({ subsets: ['latin'], weight: ['400','600'] });

export default function NewProjectPage() {
  return (
    <div className={`max-w-5xl mx-auto px-6 py-10 ${Premium.className}`}>
      <header className="mb-8 text-center">
        <h1 className={`${Display.className} text-4xl md:text-5xl font-black tracking-tight text-gray-900`}>Create Project</h1>
        <p className="mt-3 text-gray-600 text-base md:text-lg">Showcase what you're building and invite co‑builders to ship with you.</p>
      </header>
      <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 md:p-8">
        <ProjectCreate />
      </section>
    </div>
  );
}
