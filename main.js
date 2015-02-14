var urlbase = 'http://qun.qzone.qq.com/group#!/@id/member';
var count = 0;
var groups = [
    {name: '10', id: '375068550'},
    {name: '11', id: '330649338'},
    {name: '8', id: '425717044'},
    {name: '2', id: '318790227'},
    {name: '6', id: '325208082'},
    {name: '7', id: '330453715'},
    {name: '9', id: '257854295'},
];
var len = groups.length;
var count = 0;

function executeScripts(tabId, scripts, func) {
    var script = scripts.shift();
    chrome.tabs.executeScript(tabId, {
        file: script,
    }, scripts.length ? function() {
        executeScripts(tabId, scripts, func);
    } : func);
}

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

function parseGroup(group) {
    var members = group.members;
    members = members.map(parseMember);
    members = members.filter(function(member) {
        return member.grade;
    });
    members.sort(function(a, b) { return b.grade - a.grade; });
    group.members = members;
    return group;
}

chrome.runtime.onMessage.addListener(function(group, sender, response) {
    chrome.tabs.remove(sender.tab.id);
    groups[count++] = parseGroup(group);
    var body = $('body');
    if (count == len) {
        groups.sort(function(a, b) { return a.name - b.name; });
        groups.map(function(group) {
            var members = group.members;
            var grades = members.map(function(member) { return member.grade; });
            var mi = Math.min.apply(null, grades);
            var ma = Math.max.apply(null, grades);
            var ave = 0.0;
            for (var i = 0; i < grades.length; ++i) {
                ave += grades[i];
            }
            ave /= grades.length;
            var ul = $('<ul />', {
                text: 'Group: ' + group.name + ' ' + group.id +
                    ' | ' + ma + '/' + mi + '/' + ave
            })
            group.members.map(function(member, index) {
                var li = $('<li />', {
                    text: (index + 1) + ': ' + member.grade + ' | ' + member.name + ' | ' + member.id
                }).appendTo(ul);
            });
            ul.appendTo(body);
        });
    }
});
