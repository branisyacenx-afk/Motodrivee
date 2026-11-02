import { useEffect, useState } from 'react';
import { GameScreen } from '@/components/game/GameScreen';
import { GarageScreen } from '@/components/screens/GarageScreen';
import { LeaderboardScreen } from '@/components/screens/LeaderboardScreen';
import { MenuScreen } from '@/components/screens/MenuScreen';
import { SummaryScreen } from '@/components/screens/SummaryScreen';
import type { ShiftSummary } from '@/game/types';
import { claimDaily, creditShift, loadProfile, saveProfile, todayKey, type Profile } from '@/lib/profile';

type Screen = 'menu' | 'garage' | 'leaderboard' | 'play' | 'summary';

function App() {
  const [profile, setProfile] = useState<Profile>(loadProfile);
  const [screen, setScreen] = useState<Screen>('menu');
  const [summary, setSummary] = useState<ShiftSummary | null>(null);

  useEffect(() => {
    saveProfile(profile);
  }, [profile]);

  const handleFinish = (result: ShiftSummary) => {
    setProfile((prev) => creditShift(prev, result));
    setSummary(result);
    setScreen('summary');
  };

  return (
    <div className="min-h-full bg-slate-950">
      {screen === 'menu' && (
        <MenuScreen
          profile={profile}
          onStart={() => setScreen('play')}
          onGarage={() => setScreen('garage')}
          onLeaderboard={() => setScreen('leaderboard')}
          onClaimDaily={() => setProfile((prev) => claimDaily(prev, todayKey()) ?? prev)}
        />
      )}
      {screen === 'garage' && (
        <GarageScreen profile={profile} onUpdate={setProfile} onBack={() => setScreen('menu')} />
      )}
      {screen === 'leaderboard' && <LeaderboardScreen onBack={() => setScreen('menu')} />}
      {screen === 'play' && <GameScreen profile={profile} onFinish={handleFinish} />}
      {screen === 'summary' && summary && (
        <SummaryScreen
          summary={summary}
          profile={profile}
          onPlayAgain={() => setScreen('play')}
          onLeaderboard={() => setScreen('leaderboard')}
          onMenu={() => setScreen('menu')}
        />
      )}
    </div>
  );
}

export default App;
