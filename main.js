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
    {name: '4', id: '330453715'},
    {name: '1', id: '336517952'},
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

// 取得自己的排名
function getRank(members) {
    var rank = 1;
    for (var i = 0; i < members.length; ++i) {
        var member = members[i];
        if (me.grade < member.grade) {
            ++rank;
        } else if (me.grade == member.grade) {
            if (member.id.indexOf(me.id) != -1) {
                break;
            } else {
                ++rank;
            }
        } else {
            break;
        }
    }
    return rank + ' (' + (rank * 100.0 / members.length).toFixed(0) + '%)';
}

// 排序及统计信息
function proc(groups) {
    groups.forEach(function(group) {
        // 查找自己的排名
        group.myRank = getRank(group.members);
    });
    // 组间按最高分降序排序
    groups.sort(function(a, b) { return b.maxGrade - a.maxGrade; });
    groups.forEach(function(group, index) { group.rankByMaxGrade = index + 1; });
    // 组间按平均分降序排序
    groups.sort(function(a, b) { return b.aveGrade - a.aveGrade; });
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
    info.aveGrade = (grades.reduce(function(prev, cur) { return prev + cur; }, 0.0) / grades.length).toFixed(0);
    info.members = members;
    // 全院排名
    me.rank = getRank(members);
    return info;
}

function makeTable(rows, cls) {
    var table = $('<table />');
    if (cls) {
        table.attr('class', cls);
    }
    rows.forEach(function(row) {
        var tr = $('<tr />');
        row.forEach(function(col) {
            $('<td />', {text: col}).appendTo(tr);
        });
        tr.appendTo(table);
    });
    return table;
}

function drawHisto(a, mi, ma) {
    var binSize = 10;
    mi -= mi % binSize;
    ma -= ma % binSize;
    var n = (ma - mi) / binSize + 1;
    var his = Array.apply(null, new Array(n)).map(function() { return 0; });
    a.forEach(function(e) {
        e -= e % binSize;
        var t = e - mi;
        var i = t / binSize;
        ++his[i];
    });
    var labels = Array.apply(null, new Array(n)).map(function(v, i) {
        return mi + i * binSize;
    });
    // draw
    var canvas = $('<canvas />');
    var cvs = canvas[0];
    cvs.width = 800; cvs.height = 480;
    var ctx = cvs.getContext('2d');
    var x = 0;
    var y = cvs.height;
    console.log(x, y);
    ctx.font = '12 Microsoft YaHei';
    var dx = cvs.width / n;
    var maHis = Math.max.apply(null, his) * 1.0;
    for (var i = 0; i < n; ++i) {
        var height = cvs.height * his[i] / maHis;
        if (his[i]) {
            ctx.fillStyle = '#81BEF7';
            ctx.fillRect(x, cvs.height - height, dx - 1, height - 20);
        }
        ctx.fillStyle = '#000';
        ctx.fillText(labels[i] + '  (' + his[i] + ')', x, y);
        x += dx;
    }
    return canvas;
}

// 输出
function render(groups, info) {
    var body = $('body');
    makeTable([
        ['院系', '最高分', '最低分', '平均分', '人数', '我的排名'],
        ['计算机科学与技术', info.maxGrade, info.minGrade, info.aveGrade, info.members.length, me.rank],
    ]).appendTo(body);
    
    groups.forEach(function(group) {
        makeTable([
            ['组', '组排名(最高分)', '组排名(平均分)', '最高分', '最低分', '平均分', '人数', '我的排名'],
            [group.name, group.rankByMaxGrade, group.rankByAveGrade, group.maxGrade, group.minGrade, group.aveGrade, group.members.length, group.myRank],
        ], 'group-info').appendTo(body);
        var rows = [
            ['排名', '分数', '姓名', 'QQ'],
        ];
        rows = rows.concat(group.members.map(function(member, index) {
            return [index + 1, member.grade, member.name, member.id];
        }));
        makeTable(rows, 'members').appendTo(body);
    });
    
    drawHisto(info.members.map(function(member) { return member.grade; }), info.minGrade, info.maxGrade).appendTo(body);

    var rows = [
        ['排名', '分数', '姓名', 'QQ'],
    ];
    rows = rows.concat(info.members.map(function(member, index) {
        return [index + 1, member.grade, member.name, member.id];
    }));
    makeTable(rows, 'members').appendTo(body);
}

chrome.runtime.onMessage.addListener(function(group, sender, response) {
    chrome.tabs.remove(sender.tab.id);
    groups[count++] = group;
    if (count == len) {
        var info = proc(groups);
        render(groups, info);
    }
});
