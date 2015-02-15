// 替换id为群号即可得到访问url
// 需保证浏览器中有qq的cookie (其实可以做登陆功能，不过比较麻烦)
var urlbase = 'http://qun.qzone.qq.com/group#!/@id/member';
// 初始群信息，获取后会添加members成员
var groups = [
    {name: '10', id: '375068550'},
    {name: '11', id: '330649338'},
    {name: '8', id: '425717044'},
    {name: '2', id: '318790227'},
    {name: '6', id: '325208082'},
    {name: '7', id: '330453715'},
    {name: '9', id: '257854295'},
];
// 群个数
var len = groups.length;
// 统计信息已获取的群
var count = 0;
// 自己的分数和所在组
var me = {grade: 343, groupName: '9', id: '421070483'};

// 在tab上顺序执行多个脚本
function executeScripts(tabId, scripts, func) {
    var script = scripts.shift();
    chrome.tabs.executeScript(tabId, {
        file: script,
    }, scripts.length ? function() {
        executeScripts(tabId, scripts, func);
    } : func);
}

// 打开每个群的tab并获取信息
// 获取逻辑在group.js中，通过向其发送消息启动
$(function() {
    for (var i = 0; i < groups.length; ++i) {
        var group = groups[i];
        var url = urlbase.replace('@id', group.id);
        chrome.tabs.create({
            url: url,
            active: false
        }, (function(group) {
            return function(tab) {
                executeScripts(tab.id, ['jquery.js', 'group.js'], function() {
                    chrome.tabs.sendMessage(tab.id, {
                        name: group.name,
                        id: group.id
                    });
                });
            };
        })(group));
    }
});

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
    return group;
}

function getRank(members) {
    var rank = 1;
    for (var i = 0; i < members.length; ++i) {
        var member = members[i];
        if (me.grade < member.grade) {
            ++rank;
        } else if (me.grade == member.grade) {
            if (member.id.indexOf(me.id) != -1) {
                return rank;
            } else {
                ++rank;
            }
        } else {
            return rank;
        }
    }
    return rank;
}

// 排序及统计信息
function proc(groups) {
    groups.forEach(function(group) {
        // 对组成员按分数降序排序
        group.members.sort(function(a, b) { return b.grade - a.grade; });
        // 计算最高/最低/平均分
        var grades = group.members.map(function(member) { return member.grade; });
        group.minGrade = Math.min.apply(null, grades);
        group.maxGrade = Math.max.apply(null, grades);
        group.aveGrade = grades.reduce(function(prev, cur) { return prev + cur; }, 0.0) / grades.length;
        // 查找自己的排名
        group.myRank = getRank(group.members);
    });
    // 组间按最高分排序
    groups.sort(function(a, b) { return a.maxGrade - b.maxGrade; });
    groups.forEach(function(group, index) { group.rankByMaxGrade = index + 1; });
    // 组间按平均分排序
    groups.sort(function(a, b) { return a.aveGrade - b.aveGrade; });
    groups.forEach(function(group, index) { group.rankByAveGrade = index + 1; });
    // 按组名排序
    groups.sort(function(a, b) { return a.name - b.name; });
    // 全院排序
    var info = {};
    members = groups.reduce(function(prev, cur) { return prev.concat(cur.members); }, []);
    members.sort(function(a, b) { return b.grade - a.grade; });
    // 全院最高/最低/平均分
    grades = members.map(function(member) { return member.grade; });
    info.minGrade = Math.min.apply(null, grades);
    info.maxGrade = Math.max.apply(null, grades);
    info.aveGrade = grades.reduce(function(prev, cur) { return prev + cur; }, 0.0) / grades.length;
    // 全院排名
    me.rank = getRank(members);
    return info;
}

function renderInfo(info) {
    function renderGrade(cls, name, grade) {
        var div = $('<div />', {'class': cls});
        $('<span />', {text: name}).appendTo(div);
        $('<span />', {'class': cls, text: grade}).appendTo(div);
        return div;
    }

    var div = $('<div />', {'class': 'info'});
    renderGrade('maxGrade', '最高分：', info.maxGrade).appendTo(div);
    renderGrade('minGrade', '最低分：', info.minGrade).appendTo(div);
    renderGrade('aveGrade', '平均分：', info.aveGrade.toFixed(0)).appendTo(div);
    return div;
}

function renderMember(member, rank) {
    var div = $('<li />', {'class': 'member'});
    $('<span />', {'class': 'rank', text: rank + ' '}).appendTo(div);
    $('<span />', {'class': 'grade', text: member.grade + ' '}).appendTo(div);
    $('<span />', {'class': 'name', text: member.name + ' '}).appendTo(div);
    $('<span />', {'class': 'id', text: member.id + ' '}).appendTo(div);
    return div;
}

function renderGroup(group) {
    var div = $('<div />', {'class': 'group'});
    $('<span />', {'class': 'name', text: group.name + '组'}).appendTo(div);
    $('<span />', {'class': 'myRank', text: group.myRank}).appendTo(div);
    renderInfo(group).appendTo(div);
    var ul = $('<ul />', {'class': 'members'});
    group.members.forEach(function(member, index) {
        renderMember(member, index + 1).appendTo(ul);
    });
    ul.appendTo(div);
    return div;
}

function renderMe(me) {
    var div = $('<div />', {'class': 'me'});
    $('<span />', {text: '全院排名：'}).appendTo(div);
    $('<span />', {'class': 'rank', text: me.rank}).appendTo(div);
    return div;
}

// 输出
function render(groups, info) {
    var body = $('body');
    renderInfo(info).appendTo(body);
    renderMe(me).appendTo(body);
    console.log('info rendered');
    groups.forEach(function(group) { renderGroup(group).appendTo(body); });
    console.log('groups rendered');
}

chrome.runtime.onMessage.addListener(function(group, sender, response) {
    chrome.tabs.remove(sender.tab.id);
    groups[count++] = parseGroup(group);
    if (count == len) {
        var info = proc(groups);
        render(groups, info);
    }
});
