const fs = require('fs');
let c = fs.readFileSync('src/App.js', 'utf8');

const target = `  const [tlEvents, setTlEvents] = useState([`;
const addition = `  const [staffList, setStaffList] = useState([]);
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({ name: "", phone: "", role: "worker", team: "", position: "", work_type: "유지보수" });
  const [situationTab, setSituationTab] = useState("사고 현황");
  `;

if(c.includes(target)) {
  c = c.replace(target, addition + target);
  console.log('state 추가 완료');
} else {
  console.log('못찾음');
  const idx = c.indexOf('tlEvents');
  console.log(JSON.stringify(c.slice(idx-20, idx+50)));
}

fs.writeFileSync('src/App.js', c, 'utf8');