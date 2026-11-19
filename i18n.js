// Interface languages for the main page chrome (header, pickers, tabs, search, "Find what to use").
// Listing details stay in English for now. Drafted translations: to be reviewed by native speakers.
export const LANGS = { en: 'English', ar: 'العربية', hi: 'हिन्दी', pt: 'Português', id: 'Bahasa Indonesia', sw: 'Kiswahili' };
const RTL = new Set(['ar']);

const S = {
  en: {
    ulang: 'Your language', aispeaks: 'AI that speaks', look_dark: 'Dark', browse: '📚 Browse the catalog', taglineShort: 'AI you can actually use, wherever you live.', mbFind: 'Find', mbBrowse: 'Browse', mbSaved: 'Saved', mbSearch: 'Search', mbNew: 'New this week', mbGuides: 'Guides', mbGlossary: 'Glossary', mbStatus: 'Status', look_dim: 'In between', look_light: 'Light', anylang: 'Any language',
    device: 'Your device', country: 'Your country', memory: 'Memory…', choose: 'Choose…', language: 'Language',
    hint: "💡 Tell us your device's memory and your country: CleverFox then puts first, and highlights, the models that fit your machine and the apps and services that work in your country and accept a way you can pay.",
    tagline: 'AI models, datasets, apps and hosting from every source, and whether you can use them where you live: free options, paying without a card, local models and nearby data centers.',
    find: '🦊 Find what to use', iwant: 'I want to', on: 'on', computer: 'my computer', phone: 'my phone', web: 'the web (no download)', go: 'Show my picks',
    note: 'Uses your device memory and country from the pickers above. Picks come from stated facts: memory fit, independent benchmarks, popularity, free options, country and ways to pay. Only checked apps and hosts.',
    models: 'Models', datasets: 'Datasets', apps: 'Apps', hosting: 'Hosting', search: 'Search name, publisher, language, task…', empty: 'Nothing matches these filters. Try removing one.',
    newweek: '🆕 New this week', runself: '💻 Run it yourself', offline: '📱 Offline on your phone', appsCol: '📲 Apps', online: '🧑‍💻 For developers (API)',
    runNote: 'Free, private, works offline.', offNote: 'Runs on the phone itself once a model is downloaded.', appsNote: 'Not shown if unavailable in your country.', onlineNote: 'Used from code or developer apps, with no download: pay per use through an API provider.',
    nothing: 'Nothing matches yet. Try another task or device.', share: '🔗 Share these picks', finding: 'Finding picks…', draft: '',
    t_chat: 'chat', t_writing: 'write', t_coding: 'code', t_reasoning: 'reason through problems', t_math: 'do maths', t_analytics: 'analyse data', t_images: 'make images', t_vision: 'understand images', t_speech: 'work with speech', t_video: 'make video', t_translation: 'translate', t_search: 'search', t_tools: 'build agents and tools',
  },
  ar: {
    ulang: 'لغتك', aispeaks: 'ذكاء اصطناعي يتحدث', look_dark: 'داكن', browse: '📚 تصفّح الدليل', taglineShort: 'ذكاء اصطناعي يمكنك استخدامه فعلاً، أينما كنت.', mbFind: 'ابحث عمّا يناسبك', mbBrowse: 'تصفّح', mbSaved: 'المحفوظة', mbSearch: 'بحث', mbNew: 'جديد هذا الأسبوع', mbGuides: 'أدلة', mbGlossary: 'المصطلحات', mbStatus: 'الحالة', look_dim: 'بين بين', look_light: 'فاتح', anylang: 'أي لغة',
    device: 'جهازك', country: 'بلدك', memory: 'الذاكرة…', choose: 'اختر…', language: 'اللغة',
    hint: '💡 أخبرنا بذاكرة جهازك وبلدك: يعرض CleverFox أولاً ويُبرز النماذج التي تناسب جهازك، والتطبيقات والخدمات المتاحة في بلدك والتي تقبل وسيلة دفع تستطيع استخدامها.',
    tagline: 'نماذج ذكاء اصطناعي وبيانات وتطبيقات واستضافة من كل المصادر، ومعرفة إن كان بإمكانك استخدامها حيث تعيش: خيارات مجانية، والدفع دون بطاقة، ونماذج تعمل على جهازك، ومراكز بيانات قريبة.',
    find: '🦊 اعثر على ما يناسبك', iwant: 'أريد أن', on: 'على', computer: 'حاسوبي', phone: 'هاتفي', web: 'الويب (دون تنزيل)', go: 'اعرض اختياراتي',
    note: 'نستخدم ذاكرة جهازك وبلدك من الخيارات أعلاه. الاختيارات مبنية على حقائق معلنة: ملاءمة الذاكرة، واختبارات أداء مستقلة، والشعبية، والخيارات المجانية، والبلد، وطرق الدفع.',
    models: 'النماذج', datasets: 'مجموعات البيانات', apps: 'التطبيقات', hosting: 'الاستضافة', search: 'ابحث بالاسم أو الناشر أو اللغة أو المهمة…', empty: 'لا توجد نتائج لهذه الفلاتر. جرّب إزالة أحدها.',
    newweek: '🆕 الجديد هذا الأسبوع', runself: '💻 شغّله بنفسك', offline: '📱 دون إنترنت على هاتفك', appsCol: '📲 التطبيقات', online: '🧑‍💻 للمطورين (API)',
    runNote: 'مجاني وخاص ويعمل دون إنترنت.', offNote: 'يعمل على الهاتف نفسه بعد تنزيل النموذج.', appsNote: 'لا نعرض ما هو غير متاح في بلدك.', onlineNote: 'يُستخدم من خلال البرمجة أو تطبيقات المطورين دون تنزيل: ادفع حسب الاستخدام عبر مزوّد API.',
    nothing: 'لا يوجد ما يطابق بعد. جرّب مهمة أو جهازاً آخر.', share: '🔗 شارك هذه الاختيارات', finding: 'جارٍ البحث عن الاختيارات…', draft: 'ترجمة أولية، وتفاصيل القوائم بالإنجليزية.',
    t_chat: 'أتحدث', t_writing: 'أكتب', t_coding: 'أبرمج', t_reasoning: 'أحل المسائل بالتفكير', t_math: 'أحل الرياضيات', t_analytics: 'أحلل البيانات', t_images: 'أصنع صوراً', t_vision: 'أفهم الصور', t_speech: 'أعمل مع الصوت', t_video: 'أصنع فيديو', t_translation: 'أترجم', t_search: 'أبحث', t_tools: 'أبني وكلاء وأدوات',
  },
  hi: {
    ulang: 'आपकी भाषा', aispeaks: 'AI जो बोलती है', look_dark: 'गहरा', browse: '📚 पूरी सूची देखें', taglineShort: 'ऐसा AI जिसे आप सच में इस्तेमाल कर सकें, जहाँ भी हों।', mbFind: 'खोजें', mbBrowse: 'सूची', mbSaved: 'सहेजे गए', mbSearch: 'तलाश', mbNew: 'इस हफ़्ते नया', mbGuides: 'गाइड', mbGlossary: 'शब्दावली', mbStatus: 'स्थिति', look_dim: 'बीच का', look_light: 'हल्का', anylang: 'कोई भी भाषा',
    device: 'आपका डिवाइस', country: 'आपका देश', memory: 'मेमोरी…', choose: 'चुनें…', language: 'भाषा',
    hint: '💡 अपने डिवाइस की मेमोरी और अपना देश बताएं: CleverFox पहले वे मॉडल दिखाएगा जो आपकी मशीन पर चलते हैं, और वे ऐप और सेवाएं जो आपके देश में काम करती हैं और जिनका भुगतान आप कर सकते हैं।',
    tagline: 'हर स्रोत से AI मॉडल, डेटासेट, ऐप और होस्टिंग, और क्या आप इन्हें अपने देश में इस्तेमाल कर सकते हैं: मुफ़्त विकल्प, बिना कार्ड भुगतान, अपने कंप्यूटर पर चलने वाले मॉडल और पास के डेटा सेंटर।',
    find: '🦊 क्या इस्तेमाल करें, खोजें', iwant: 'मैं चाहता/चाहती हूं', on: 'पर', computer: 'मेरे कंप्यूटर', phone: 'मेरे फ़ोन', web: 'वेब (बिना डाउनलोड)', go: 'मेरे सुझाव दिखाएं',
    note: 'ऊपर चुनी गई मेमोरी और देश का इस्तेमाल होता है। सुझाव बताए गए तथ्यों से बनते हैं: मेमोरी में फ़िट, स्वतंत्र बेंचमार्क, लोकप्रियता, मुफ़्त विकल्प, देश और भुगतान के तरीके।',
    models: 'मॉडल', datasets: 'डेटासेट', apps: 'ऐप', hosting: 'होस्टिंग', search: 'नाम, प्रकाशक, भाषा, काम से खोजें…', empty: 'इन फ़िल्टरों से कुछ नहीं मिला। कोई फ़िल्टर हटाकर देखें।',
    newweek: '🆕 इस हफ़्ते नया', runself: '💻 खुद चलाएं', offline: '📱 फ़ोन पर बिना इंटरनेट', appsCol: '📲 ऐप', online: '🧑‍💻 डेवलपर्स के लिए (API)',
    runNote: 'मुफ़्त, निजी, बिना इंटरनेट चलता है।', offNote: 'मॉडल डाउनलोड होने के बाद फ़ोन पर ही चलता है।', appsNote: 'आपके देश में उपलब्ध न हो तो नहीं दिखाया जाता।', onlineNote: 'कोड या डेवलपर ऐप से, बिना डाउनलोड: API प्रदाता से इस्तेमाल के हिसाब से भुगतान।',
    nothing: 'अभी कुछ नहीं मिला। कोई और काम या डिवाइस चुनें।', share: '🔗 ये सुझाव शेयर करें', finding: 'सुझाव खोजे जा रहे हैं…', draft: 'प्रारंभिक अनुवाद; सूची का विवरण अंग्रेज़ी में है।',
    t_chat: 'बातचीत करना', t_writing: 'लिखना', t_coding: 'कोड लिखना', t_reasoning: 'सोचकर समस्याएं हल करना', t_math: 'गणित करना', t_analytics: 'डेटा का विश्लेषण करना', t_images: 'तस्वीरें बनाना', t_vision: 'तस्वीरें समझना', t_speech: 'आवाज़ के साथ काम करना', t_video: 'वीडियो बनाना', t_translation: 'अनुवाद करना', t_search: 'खोजना', t_tools: 'एजेंट और टूल बनाना',
  },
  pt: {
    ulang: 'Seu idioma', aispeaks: 'IA que fala', look_dark: 'Escuro', browse: '📚 Explorar o catálogo', taglineShort: 'IA que você pode usar de verdade, onde quer que esteja.', mbFind: 'Encontrar', mbBrowse: 'Explorar', mbSaved: 'Salvos', mbSearch: 'Buscar', mbNew: 'Novidades da semana', mbGuides: 'Guias', mbGlossary: 'Glossário', mbStatus: 'Status', look_dim: 'Intermediário', look_light: 'Claro', anylang: 'Qualquer idioma',
    device: 'Seu dispositivo', country: 'Seu país', memory: 'Memória…', choose: 'Escolha…', language: 'Idioma',
    hint: '💡 Informe a memória do seu dispositivo e o seu país: o CleverFox mostra primeiro, e destaca, os modelos que cabem na sua máquina e os apps e serviços que funcionam no seu país e aceitam uma forma de pagamento que você pode usar.',
    tagline: 'Modelos de IA, conjuntos de dados, apps e hospedagem de todas as fontes, e se você pode usá-los onde mora: opções grátis, pagamento sem cartão, modelos locais e data centers próximos.',
    find: '🦊 Descubra o que usar', iwant: 'Quero', on: 'no', computer: 'meu computador', phone: 'meu celular', web: 'navegador (sem download)', go: 'Mostrar sugestões',
    note: 'Usa a memória e o país escolhidos acima. As sugestões vêm de fatos declarados: memória, benchmarks independentes, popularidade, opções grátis, país e formas de pagamento.',
    models: 'Modelos', datasets: 'Dados', apps: 'Apps', hosting: 'Hospedagem', search: 'Busque por nome, editora, idioma, tarefa…', empty: 'Nada corresponde a estes filtros. Tente remover um.',
    newweek: '🆕 Novidades da semana', runself: '💻 Rodar você mesmo', offline: '📱 Offline no celular', appsCol: '📲 Apps', online: '🧑‍💻 Para desenvolvedores (API)',
    runNote: 'Grátis, privado, funciona offline.', offNote: 'Roda no próprio celular depois de baixar um modelo.', appsNote: 'Não aparece se não estiver disponível no seu país.', onlineNote: 'Usado por código ou apps de desenvolvedor, sem baixar: pague pelo uso com um provedor de API.',
    nothing: 'Nada ainda. Tente outra tarefa ou dispositivo.', share: '🔗 Compartilhar sugestões', finding: 'Buscando sugestões…', draft: 'Tradução preliminar; os detalhes das listagens estão em inglês.',
    t_chat: 'conversar', t_writing: 'escrever', t_coding: 'programar', t_reasoning: 'resolver problemas', t_math: 'fazer contas', t_analytics: 'analisar dados', t_images: 'criar imagens', t_vision: 'entender imagens', t_speech: 'trabalhar com voz', t_video: 'criar vídeos', t_translation: 'traduzir', t_search: 'pesquisar', t_tools: 'criar agentes e ferramentas',
  },
  id: {
    ulang: 'Bahasa Anda', aispeaks: 'AI yang berbahasa', look_dark: 'Gelap', browse: '📚 Jelajahi katalog', taglineShort: 'AI yang benar-benar bisa Anda pakai, di mana pun Anda berada.', mbFind: 'Cari', mbBrowse: 'Jelajahi', mbSaved: 'Tersimpan', mbSearch: 'Telusuri', mbNew: 'Baru minggu ini', mbGuides: 'Panduan', mbGlossary: 'Glosarium', mbStatus: 'Status', look_dim: 'Sedang', look_light: 'Terang', anylang: 'Bahasa apa saja',
    device: 'Perangkat Anda', country: 'Negara Anda', memory: 'Memori…', choose: 'Pilih…', language: 'Bahasa',
    hint: '💡 Beri tahu kami memori perangkat dan negara Anda: CleverFox lalu menampilkan lebih dulu, dan menandai, model yang muat di mesin Anda serta aplikasi dan layanan yang tersedia di negara Anda dan menerima cara bayar yang bisa Anda pakai.',
    tagline: 'Model AI, dataset, aplikasi, dan hosting dari semua sumber, serta apakah Anda bisa memakainya di tempat Anda: opsi gratis, bayar tanpa kartu, model lokal, dan pusat data terdekat.',
    find: '🦊 Temukan yang cocok', iwant: 'Saya ingin', on: 'di', computer: 'komputer saya', phone: 'ponsel saya', web: 'web (tanpa unduh)', go: 'Tampilkan pilihan',
    note: 'Memakai memori dan negara dari pilihan di atas. Pilihan dibuat dari fakta yang tercatat: kecocokan memori, benchmark independen, popularitas, opsi gratis, negara, dan cara bayar.',
    models: 'Model', datasets: 'Dataset', apps: 'Aplikasi', hosting: 'Hosting', search: 'Cari nama, penerbit, bahasa, tugas…', empty: 'Tidak ada yang cocok. Coba hapus satu filter.',
    newweek: '🆕 Baru minggu ini', runself: '💻 Jalankan sendiri', offline: '📱 Offline di ponsel', appsCol: '📲 Aplikasi', online: '🧑‍💻 Untuk pengembang (API)',
    runNote: 'Gratis, privat, bisa offline.', offNote: 'Berjalan di ponsel setelah model diunduh.', appsNote: 'Tidak ditampilkan jika tidak tersedia di negara Anda.', onlineNote: 'Dipakai lewat kode atau aplikasi pengembang tanpa unduhan: bayar per pemakaian melalui penyedia API.',
    nothing: 'Belum ada yang cocok. Coba tugas atau perangkat lain.', share: '🔗 Bagikan pilihan ini', finding: 'Mencari pilihan…', draft: 'Terjemahan awal; detail listing dalam bahasa Inggris.',
    t_chat: 'mengobrol', t_writing: 'menulis', t_coding: 'membuat kode', t_reasoning: 'memecahkan masalah', t_math: 'berhitung', t_analytics: 'menganalisis data', t_images: 'membuat gambar', t_vision: 'memahami gambar', t_speech: 'mengolah suara', t_video: 'membuat video', t_translation: 'menerjemahkan', t_search: 'mencari', t_tools: 'membuat agen dan alat',
  },
  sw: {
    ulang: 'Lugha yako', aispeaks: 'AI inayozungumza', look_dark: 'Giza', browse: '📚 Vinjari orodha', taglineShort: 'AI unayoweza kuitumia kweli, popote ulipo.', mbFind: 'Tafuta', mbBrowse: 'Vinjari', mbSaved: 'Zilizohifadhiwa', mbSearch: 'Tafuta', mbNew: 'Mpya wiki hii', mbGuides: 'Miongozo', mbGlossary: 'Kamusi', mbStatus: 'Hali', look_dim: 'Kati', look_light: 'Mwanga', anylang: 'Lugha yoyote',
    device: 'Kifaa chako', country: 'Nchi yako', memory: 'Kumbukumbu…', choose: 'Chagua…', language: 'Lugha',
    hint: '💡 Tuambie kumbukumbu (RAM) ya kifaa chako na nchi yako: CleverFox itaonyesha kwanza, na kuangazia, modeli zinazotosha kwenye mashine yako na programu na huduma zinazopatikana nchini mwako na zinazokubali njia ya malipo unayoweza kutumia.',
    tagline: 'Modeli za AI, data, programu na huduma za seva kutoka kila chanzo, na kama unaweza kuzitumia unapoishi: chaguo za bure, kulipa bila kadi, modeli za kuendesha mwenyewe na vituo vya data vilivyo karibu.',
    find: '🦊 Tafuta cha kutumia', iwant: 'Nataka', on: 'kwenye', computer: 'kompyuta yangu', phone: 'simu yangu', web: 'mtandaoni (bila kupakua)', go: 'Onyesha mapendekezo',
    note: 'Tunatumia kumbukumbu na nchi uliyochagua juu. Mapendekezo yanatokana na ukweli uliotajwa: kutosha kwenye kumbukumbu, vipimo huru, umaarufu, chaguo za bure, nchi na njia za malipo.',
    models: 'Modeli', datasets: 'Data', apps: 'Programu', hosting: 'Seva', search: 'Tafuta kwa jina, mchapishaji, lugha, kazi…', empty: 'Hakuna kinacholingana. Jaribu kuondoa kichujio kimoja.',
    newweek: '🆕 Mpya wiki hii', runself: '💻 Endesha mwenyewe', offline: '📱 Bila mtandao kwenye simu', appsCol: '📲 Programu', online: '🧑‍💻 Kwa wasanidi (API)',
    runNote: 'Bure, faragha, inafanya kazi bila mtandao.', offNote: 'Inaendeshwa kwenye simu yenyewe baada ya kupakua modeli.', appsNote: 'Haionyeshwi kama haipatikani nchini mwako.', onlineNote: 'Hutumika kupitia msimbo au programu za wasanidi bila kupakua: lipa kwa matumizi kupitia mtoa huduma wa API.',
    nothing: 'Bado hakuna kinacholingana. Jaribu kazi au kifaa kingine.', share: '🔗 Shiriki mapendekezo haya', finding: 'Tunatafuta mapendekezo…', draft: 'Tafsiri ya awali; maelezo ya orodha yako kwa Kiingereza.',
    t_chat: 'kuzungumza', t_writing: 'kuandika', t_coding: 'kuandika programu', t_reasoning: 'kutatua matatizo', t_math: 'kufanya hesabu', t_analytics: 'kuchambua data', t_images: 'kutengeneza picha', t_vision: 'kuelewa picha', t_speech: 'kufanya kazi na sauti', t_video: 'kutengeneza video', t_translation: 'kutafsiri', t_search: 'kutafuta', t_tools: 'kujenga mawakala na zana',
  },
};

let lang = 'en';
export const t = (k) => S[lang]?.[k] ?? S.en[k] ?? k;
export const getLang = () => lang;
export function pickLang(saved) {
  if (saved && S[saved]) return saved;
  const nav = (navigator.languages || [navigator.language || 'en']).map((l) => String(l).slice(0, 2).toLowerCase());
  return nav.find((l) => S[l]) || 'en';
}
// Elements carry data-i18n="key" (text), data-i18n-ph="key" (placeholder) or data-i18n-label="key" (aria-label).
export function applyLang(l) {
  lang = S[l] ? l : 'en';
  document.documentElement.lang = lang;
  document.documentElement.dir = RTL.has(lang) ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    // Keep a trailing child (like a count) intact: only the first text node is translated.
    const tn = [...el.childNodes].find((n) => n.nodeType === 3 && n.textContent.trim());
    if (tn) tn.textContent = t(el.dataset.i18n) + (el.children.length ? ' ' : ''); else el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
  const d = document.getElementById('lang-draft'); if (d) { d.textContent = t('draft'); d.hidden = !t('draft'); }
}
