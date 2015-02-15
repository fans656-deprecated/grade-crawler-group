// 解析群成员名片
function parseMember(member) {
    var name = member.name;
    if (name.indexOf('围观') == -1) {
        var m = (' ' + name + ' ').match(/\D([234]\d\d)\D/);
        if (m) {
            var snum = m[1];
            var grade = parseInt(snum);
            if (grade != 408) {
                member.grade = grade;
            }
        }
    }
    return member;
}

// 解析群
function parseGroup(group) {
    group.members = group.members.map(parseMember).filter(function(member) {
        return member.grade;
    });
    // 对组成员按分数降序排序
    group.members.sort(function(a, b) { return b.grade - a.grade; });
    // 计算最高/最低/平均分
    var grades = group.members.map(function(member) { return member.grade; });
    group.minGrade = Math.min.apply(null, grades);
    group.maxGrade = Math.max.apply(null, grades);
    group.aveGrade = (grades.reduce(function(prev, cur) { return prev + cur; }, 0.0) / grades.length).toFixed(0);
    return group;
}

chrome.runtime.onMessage.addListener(function(group, sender, sendResponse) {
    var id = setInterval(function() {
        var members = $('div.members');
        if (members.length) {
            clearInterval(id);
            members = members.map(function() {
                var member = $(this);
                return {
                    name: member.find('.member_name').text(),
                    id: member.find('.member_id').text().match(/\d+/)
                };
            }).toArray();
            group.members = members;
            chrome.runtime.sendMessage(parseGroup(group));
        }
    }, 100);
});

