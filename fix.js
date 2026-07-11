const fs = require('fs');
let c = fs.readFileSync('src/App.js', 'utf8');

// useEffect 의존성을 [] → [userRole]로 변경해서
// userRole이 설정될 때마다 재구독
c = c.replace(
  `    return () => supabase.removeChannel(channel);
  }, []);

  // ── Supabase Realtime — 상급자 새 사고 보고 수신`,
  `    return () => supabase.removeChannel(channel);
  }, [userRole]);

  // ── Supabase Realtime — 상급자 새 사고 보고 수신`
);

c = c.replace(
  `    return () => supabase.removeChannel(channel);
  }, []);

  const currentRecipients`,
  `    return () => supabase.removeChannel(channel);
  }, [userRole]);

  const currentRecipients`
);

fs.writeFileSync('src/App.js', c, 'utf8');
console.log('완료');