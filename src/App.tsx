import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Clock, Calendar, ChevronDown, Moon, Sun, BellRing, BellOff, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

declare global {
  interface Window {
    Telegram?: {
      WebApp: any;
    };
  }
}

const CITIES = [
  { id: 'Andijan', name: 'Andijon', lat: 40.782064, lng: 72.344236 },
  { id: 'Angren', name: 'Angren', lat: 41.0111, lng: 70.1436 },
  { id: 'Bekobod', name: 'Bekobod', lat: 40.2167, lng: 69.2667 },
  { id: 'Bukhara', name: 'Buxoro', lat: 39.774722, lng: 64.428611 },
  { id: 'Chirchiq', name: 'Chirchiq', lat: 41.4689, lng: 69.5822 },
  { id: 'Denov', name: 'Denov', lat: 38.2667, lng: 67.8989 },
  { id: 'Fergana', name: "Farg'ona", lat: 40.384211, lng: 71.784318 },
  { id: 'Gulistan', name: 'Guliston (Sirdaryo)', lat: 40.489722, lng: 68.784167 },
  { id: 'Jizzakh', name: 'Jizzax', lat: 40.115833, lng: 67.842222 },
  { id: 'Karshi', name: 'Qarshi (Qashqadaryo)', lat: 38.861111, lng: 65.795000 },
  { id: 'Kokand', name: "Qo'qon", lat: 40.5286, lng: 70.9425 },
  { id: 'Margilan', name: "Marg'ilon", lat: 40.4715, lng: 71.7147 },
  { id: 'Namangan', name: 'Namangan', lat: 41.001111, lng: 71.667556 },
  { id: 'Navoiy', name: 'Navoiy', lat: 40.084444, lng: 65.379167 },
  { id: 'Nukus', name: "Nukus (Qoraqalpog'iston)", lat: 42.461895, lng: 59.616645 },
  { id: 'Olmaliq', name: 'Olmaliq', lat: 40.8433, lng: 69.5958 },
  { id: 'Samarkand', name: 'Samarqand', lat: 39.627012, lng: 66.974973 },
  { id: 'Shahrisabz', name: 'Shahrisabz', lat: 39.0533, lng: 66.8278 },
  { id: 'Tashkent', name: 'Toshkent', lat: 41.311081, lng: 69.240562 },
  { id: 'Termez', name: 'Termiz (Surxondaryo)', lat: 37.224167, lng: 67.278333 },
  { id: 'Urgench', name: 'Urganch (Xorazm)', lat: 41.550000, lng: 60.633333 },
  { id: 'Khiva', name: 'Xiva', lat: 41.3783, lng: 60.3639 },
  { id: 'Zarafshon', name: 'Zarafshon', lat: 41.5753, lng: 64.1986 },
];

const PRAYER_NAMES: Record<string, string> = {
  Fajr: 'Bomdod',
  Sunrise: 'Quyosh',
  Dhuhr: 'Peshin',
  Asr: 'Asr',
  Maghrib: 'Shom',
  Isha: 'Xufton',
};

const PRAYER_KEYS = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

function useTelegramTheme() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      setTheme(tg.colorScheme || 'light');
      
      const handleThemeChange = () => {
        setTheme(tg.colorScheme || 'light');
      };
      
      tg.onEvent('themeChanged', handleThemeChange);
      return () => tg.offEvent('themeChanged', handleThemeChange);
    }
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return theme;
}

export default function App() {
  const theme = useTelegramTheme();
  
  const [selectedCity, setSelectedCity] = useState(() => {
    const saved = localStorage.getItem('selectedCity');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return CITIES.find(c => c.id === 'Tashkent') || CITIES[0];
  });
  
  const [timings, setTimings] = useState<Record<string, string> | null>(null);
  const [hijriDate, setHijriDate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [nextPrayer, setNextPrayer] = useState<{ name: string; time: string; diff: string; progress: number } | null>(null);
  
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    return localStorage.getItem('notifications') === 'true';
  });
  const notifiedRef = useRef<string>('');

  useEffect(() => {
    localStorage.setItem('selectedCity', JSON.stringify(selectedCity));
  }, [selectedCity]);

  const toggleNotifications = async () => {
    if (!notificationsEnabled) {
      if (!('Notification' in window)) {
        alert("Brauzeringiz bildirishnomalarni qo'llab-quvvatlamaydi.");
        return;
      }
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        localStorage.setItem('notifications', 'true');
      } else {
        alert("Bildirishnomalarga ruxsat berilmadi.");
      }
    } else {
      setNotificationsEnabled(false);
      localStorage.setItem('notifications', 'false');
    }
  };

  const detectLocation = () => {
    if ('geolocation' in navigator) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newCity = {
            id: 'custom',
            name: 'Mening joylashuvim',
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setSelectedCity(newCity);
        },
        (error) => {
          setLoading(false);
          alert("Joylashuvni aniqlab bo'lmadi. Iltimos, ruxsat bering.");
        }
      );
    } else {
      alert("Brauzeringiz joylashuvni aniqlashni qo'llab-quvvatlamaydi.");
    }
  };

  useEffect(() => {
    const fetchTimings = async () => {
      setLoading(true);
      try {
        // Using custom method (99) with settings: Fajr 18 deg, Isha 15 deg
        // Tuning parameters to match namozvaqti.uz exactly: Imsak, Fajr, Sunrise, Dhuhr, Asr, Maghrib, Sunset, Isha, Midnight
        const res = await fetch(`https://api.aladhan.com/v1/timings?latitude=${selectedCity.lat}&longitude=${selectedCity.lng}&method=99&methodSettings=18,null,15&school=1&tune=0,13,-1,5,0,1,0,0,0`);
        const data = await res.json();
        if (data.code === 200) {
          setTimings(data.data.timings);
          const hijri = data.data.date.hijri;
          setHijriDate(`${hijri.day} ${hijri.month.en} ${hijri.year}`);
        }
      } catch (error) {
        console.error("Error fetching timings:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTimings();
  }, [selectedCity]);

  useEffect(() => {
    if (!timings) return;

    const updateCountdown = () => {
      const now = new Date();
      const timeString = now.toLocaleTimeString('en-US', { timeZone: 'Asia/Tashkent', hour12: false });
      let [hStr, mStr, sStr] = timeString.split(':');
      let h = parseInt(hStr, 10);
      let m = parseInt(mStr, 10);
      let s = parseInt(sStr, 10);
      if (h === 24) h = 0;

      const currentTime = h * 60 + m;
      const currentSeconds = s;

      const prayerTimes = PRAYER_KEYS.map(key => {
        const [hours, minutes] = timings[key].split(':').map(Number);
        return { key, time: timings[key], minutes: hours * 60 + minutes };
      });

      let next = prayerTimes.find(p => p.minutes > currentTime);
      let last = prayerTimes.slice().reverse().find(p => p.minutes <= currentTime);
      
      let isTomorrow = false;
      if (!next) {
        next = prayerTimes[0];
        isTomorrow = true;
      }
      if (!last) {
        last = prayerTimes[prayerTimes.length - 1];
      }

      let diffMinutes = next.minutes - currentTime;
      if (isTomorrow) {
        diffMinutes += 24 * 60;
      }
      
      let totalDiffMinutes = next.minutes - last.minutes;
      if (totalDiffMinutes <= 0) {
        totalDiffMinutes += 24 * 60;
      }
      
      const passedMinutes = totalDiffMinutes - diffMinutes;
      const progress = Math.max(0, Math.min(100, (passedMinutes / totalDiffMinutes) * 100));
      
      let diffSeconds = diffMinutes * 60 - currentSeconds;
      
      const diffH = Math.floor(diffSeconds / 3600);
      const diffM = Math.floor((diffSeconds % 3600) / 60);
      const diffS = diffSeconds % 60;

      const currentHM = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      
      if (notificationsEnabled && Notification.permission === 'granted') {
        PRAYER_KEYS.forEach(key => {
          if (timings[key] === currentHM && notifiedRef.current !== `${key}-${timings[key]}`) {
            new Notification("Namoz vaqti", {
              body: `${PRAYER_NAMES[key]} namozi vaqti kirdi.`,
              icon: '/vite.svg'
            });
            notifiedRef.current = `${key}-${timings[key]}`;
          }
        });
      }

      setNextPrayer({
        name: PRAYER_NAMES[next.key],
        time: next.time,
        diff: `${diffH.toString().padStart(2, '0')}:${diffM.toString().padStart(2, '0')}:${diffS.toString().padStart(2, '0')}`,
        progress
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [timings]);

  const getIcon = (key: string) => {
    if (key === 'Fajr' || key === 'Isha' || key === 'Maghrib') {
      return <Moon className="w-5 h-5" />;
    }
    return <Sun className="w-5 h-5" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-200 pb-10">
      <div className="max-w-md mx-auto p-4 flex flex-col gap-6">
        {/* Header */}
        <header className="flex items-center justify-between pt-4">
          <div>
            <h1 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">Namoz Vaqtlari</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {new Date().toLocaleDateString('uz-UZ', { timeZone: 'Asia/Tashkent', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              {hijriDate && <span className="ml-2 pl-2 border-l border-gray-300 dark:border-gray-600 font-medium">{hijriDate}</span>}
            </p>
          </div>
        </header>

        {/* City Selector and Actions */}
        <div className="flex flex-col gap-3">
          <div className="relative">
            <select
              className="w-full appearance-none bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 pr-10 text-lg font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
              value={selectedCity.id}
              onChange={(e) => {
                if (e.target.value === 'custom') return;
                setSelectedCity(CITIES.find(c => c.id === e.target.value) || CITIES[0]);
              }}
            >
              {selectedCity.id === 'custom' && (
                <option value="custom">Mening joylashuvim</option>
              )}
              {CITIES.map(city => (
                <option key={city.id} value={city.id}>{city.name}</option>
              ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
              <ChevronDown className="w-5 h-5" />
            </div>
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={detectLocation}
              className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-3 px-4 text-sm font-medium shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Navigation className="w-4 h-4 text-emerald-500" />
              Joylashuvni aniqlash
            </button>
            <button 
              onClick={toggleNotifications}
              className={`flex-1 flex items-center justify-center gap-2 border rounded-xl py-3 px-4 text-sm font-medium shadow-sm transition-colors ${
                notificationsEnabled 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400' 
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              {notificationsEnabled ? (
                <>
                  <BellRing className="w-4 h-4" />
                  Eslatmalar yoniq
                </>
              ) : (
                <>
                  <BellOff className="w-4 h-4 text-gray-400" />
                  Eslatmalar o'chiq
                </>
              )}
            </button>
          </div>
        </div>

        {/* Next Prayer Card */}
        <AnimatePresence mode="wait">
          {nextPrayer && (
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 opacity-10 transform translate-x-1/4 -translate-y-1/4">
                <Moon className="w-48 h-48" />
              </div>
              <div className="relative z-10">
                <p className="text-emerald-100 text-sm font-medium uppercase tracking-wider mb-1">Keyingi namoz</p>
                <div className="flex items-end justify-between mb-5">
                  <div>
                    <h2 className="text-4xl font-bold mb-1">{nextPrayer.name}</h2>
                    <p className="text-2xl font-medium opacity-90">{nextPrayer.time}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-100 text-xs uppercase tracking-wider mb-1">Qolgan vaqt</p>
                    <p className="text-3xl font-mono font-bold tabular-nums">{nextPrayer.diff}</p>
                  </div>
                </div>
                {/* Progress Bar */}
                <div className="h-1.5 w-full bg-emerald-900/30 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-white rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${nextPrayer.progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Prayer Times List */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
          {loading ? (
            <div className="p-8 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            </div>
          ) : timings ? (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {PRAYER_KEYS.map((key, index) => {
                const isNext = nextPrayer?.name === PRAYER_NAMES[key];
                return (
                  <motion.div 
                    key={key} 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1, duration: 0.3 }}
                    className={`flex items-center justify-between p-4 transition-colors ${
                      isNext ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        isNext ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-800 dark:text-emerald-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        {getIcon(key)}
                      </div>
                      <span className={`text-lg font-medium ${
                        isNext ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {PRAYER_NAMES[key]}
                      </span>
                    </div>
                    <span className={`text-xl font-bold ${
                      isNext ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-900 dark:text-gray-100'
                    }`}>
                      {timings[key]}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              Ma'lumot topilmadi
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
