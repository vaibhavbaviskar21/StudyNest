const fs = require('fs');
const path = require('path');

const baseDir = path.join(__dirname, '..');
const leaderboardFile = path.join(baseDir, 'Leaderboard', 'README.md');
const hallOfFameFile = path.join(baseDir, 'HallOfFame', 'README.md');

// Contributor data structure
let contributors = {};

// Scan all year folders
function scanContributions() {
  const years = ['FE', 'SE', 'TE', 'BE', 'Extras'];
  
  years.forEach(year => {
    const yearPath = path.join(baseDir, year);
    if (!fs.existsSync(yearPath)) return;
    
    // Get all subject folders
    const subjects = fs.readdirSync(yearPath);
    
    subjects.forEach(subject => {
      const subjectPath = path.join(yearPath, subject);
      if (!fs.statSync(subjectPath).isDirectory()) return;
      
      // Scan README.md in subject folder
      scanDirectory(subjectPath, year, subject);
    });
  });
}

// Recursively scan directories for contributor mentions
function scanDirectory(dir, year, subject) {
  const items = fs.readdirSync(dir);
  
  items.forEach(item => {
    const itemPath = path.join(dir, item);
    const stat = fs.statSync(itemPath);
    
    if (stat.isFile() && item.endsWith('.md')) {
      try {
        const content = fs.readFileSync(itemPath, 'utf8');
        const matches = content.match(/\*\*Contributor:\*\*\s*([\w\-]+)/gi);
        
        if (matches) {
          matches.forEach(match => {
            const username = match.split(':')[1].trim().replace(/\*+/g, '').trim();
            
            // Skip placeholder usernames
            if (username.includes('Awaiting') || username.includes('Username') || username.includes('*')) {
              return;
            }
            
            if (!contributors[username]) {
              contributors[username] = {
                totalContributions: 0,
                subjects: {}
              };
            }
            
            contributors[username].totalContributions += 1;
            
            const subjectKey = `${year}/${subject}`;
            if (!contributors[username].subjects[subjectKey]) {
              contributors[username].subjects[subjectKey] = 0;
            }
            contributors[username].subjects[subjectKey] += 1;
          });
        }
      } catch (err) {
        console.error(`Error reading file ${itemPath}:`, err.message);
      }
    }
  });
}

// Generate leaderboard markdown
function generateLeaderboard() {
  const sortedContributors = Object.entries(contributors)
    .sort(([, a], [, b]) => b.totalContributions - a.totalContributions);
  
  let md = `# 📊 StudyNest Leaderboard

![Contributors](https://img.shields.io/badge/Total_Contributors-${Object.keys(contributors).length}-blue?style=for-the-badge)

Welcome to the StudyNest Leaderboard! This page automatically tracks all contributors who have shared notes, PYQs, and resources.

---

## 🌟 Top Contributors

| Rank | Contributor | Total Contributions | Subjects Contributed | Year Coverage |
|------|-------------|---------------------|----------------------|---------------|
`;

  if (sortedContributors.length === 0) {
    md += '| 🥇 | *Be the first!* | 0 | - | - |\n';
  } else {
    sortedContributors.forEach(([username, data], index) => {
      const rank = index + 1;
      const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}`;
      const subjectCount = Object.keys(data.subjects).length;
      
      // Get unique years
      const years = [...new Set(Object.keys(data.subjects).map(s => s.split('/')[0]))];
      const yearCoverage = years.join(', ');
      
      md += `| ${medal} | [@${username}](https://github.com/${username}) | ${data.totalContributions} | ${subjectCount} | ${yearCoverage} |\n`;
    });
  }

  md += `\n---

## 📚 Subject-wise Contributions

`;

  // Year-wise breakdown
  const years = ['FE', 'SE', 'TE', 'BE', 'Extras'];
  years.forEach(year => {
    const yearContributors = {};
    
    Object.entries(contributors).forEach(([username, data]) => {
      Object.keys(data.subjects).forEach(subject => {
        if (subject.startsWith(year + '/')) {
          if (!yearContributors[username]) {
            yearContributors[username] = 0;
          }
          yearContributors[username] += data.subjects[subject];
        }
      });
    });
    
    if (Object.keys(yearContributors).length > 0) {
      md += `### ${year} (${getYearName(year)})\n\n`;
      md += `| Contributor | Contributions |\n`;
      md += `|-------------|---------------|\n`;
      
      const sorted = Object.entries(yearContributors)
        .sort(([, a], [, b]) => b - a);
      
      sorted.forEach(([username, count]) => {
        md += `| [@${username}](https://github.com/${username}) | ${count} |\n`;
      });
      md += `\n`;
    }
  });

  md += `---

## 💡 How to Join the Leaderboard

1. Fork this repository
2. Add your notes/PYQs with \`**Contributor:** YourGitHubUsername\`
3. Submit a Pull Request
4. Once merged, you'll appear here automatically! 🎉

---

## 🏅 Hall of Fame

Top 10 contributors are featured in our [Hall of Fame](../HallOfFame/README.md)!

---

**Last Updated:** ${new Date().toISOString().split('T')[0]}

*Leaderboard updates automatically on every merged PR*
`;

  // Create Leaderboard directory if it doesn't exist
  const leaderboardDir = path.join(baseDir, 'Leaderboard');
  if (!fs.existsSync(leaderboardDir)) {
    fs.mkdirSync(leaderboardDir, { recursive: true });
  }

  fs.writeFileSync(leaderboardFile, md);
  console.log('✅ Leaderboard updated!');
}

// Helper function to get year name
function getYearName(year) {
  const names = {
    'FE': 'First Year',
    'SE': 'Second Year',
    'TE': 'Third Year',
    'BE': 'Final Year',
    'Extras': 'Extra Resources'
  };
  return names[year] || year;
}

// Generate Hall of Fame markdown
function generateHallOfFame() {
  const sortedContributors = Object.entries(contributors)
    .sort(([, a], [, b]) => b.totalContributions - a.totalContributions)
    .slice(0, 10); // Top 10 only

  let md = `<div align="center">

# 🏆 Hall of Fame

**Celebrating StudyNest's Top Contributors**

*Recognizing students who help other students succeed*

</div>

---

## 🌟 Top 10 Contributors

These amazing students have shared the most valuable resources with the community!

---

## 🏅 Rankings

`;

  // Generate rankings
  for (let i = 0; i < 10; i++) {
    const rank = i + 1;
    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🏅';
    
    if (i < sortedContributors.length) {
      const [username, data] = sortedContributors[i];
      const subjectCount = Object.keys(data.subjects).length;
      const years = [...new Set(Object.keys(data.subjects).map(s => s.split('/')[0]))];
      
      md += `### ${medal} Rank ${rank}

<div align="center">

<img src="https://github.com/${username}.png" width="120" height="120" style="border-radius: 50%;" alt="${username}"/>

**[@${username}](https://github.com/${username})**

*${data.totalContributions} Contributions across ${subjectCount} subject(s)*

*Years: ${years.join(', ')}*

</div>

---

`;
    } else {
      md += `### ${medal} Rank ${rank}

<div align="center">

<img src="https://github.com/github.png" width="120" height="120" style="border-radius: 50%;" alt="Pending"/>

**[Awaiting Contributor]**

*Be the ${rank === 4 ? '4th' : rank === 5 ? '5th' : rank === 6 ? '6th' : rank === 7 ? '7th' : rank === 8 ? '8th' : rank === 9 ? '9th' : '10th'} person to contribute!*

</div>

---

`;
    }
  }

  md += `## 🎯 How to Get Featured

Want to see your name and profile picture here?

1. **Share Your Notes** - Upload notes to Google Drive and add links
2. **Add PYQs** - Previous year questions help everyone
3. **Create Study Resources** - Formula sheets, quick revision notes
4. **Include Your Username** - Add \`**Contributor:** YourGitHubUsername\`

[Start Contributing →](../CONTRIBUTING.md)

---

## 📈 View Full Rankings

For detailed statistics and subject-wise contributions:

📊 [Complete Leaderboard](../Leaderboard/README.md)

---

<div align="center">

**🌟 Every contribution helps students succeed! 🌟**

*Rankings update automatically with each merged contribution.*

**Last Updated:** ${new Date().toISOString().split('T')[0]}

---

Made with ❤️ by the StudyNest Community | **SPPU Students**

</div>`;

  // Create HallOfFame directory if it doesn't exist
  const hallOfFameDir = path.join(baseDir, 'HallOfFame');
  if (!fs.existsSync(hallOfFameDir)) {
    fs.mkdirSync(hallOfFameDir, { recursive: true });
  }

  fs.writeFileSync(hallOfFameFile, md);
  console.log('✅ Hall of Fame updated!');
}

// Main execution
console.log('🔄 Scanning contributions...');
scanContributions();

console.log(`📊 Found ${Object.keys(contributors).length} contributors`);

console.log('📝 Generating leaderboard...');
generateLeaderboard();

console.log('🏆 Generating Hall of Fame...');
generateHallOfFame();

console.log('✨ All updates complete!');
