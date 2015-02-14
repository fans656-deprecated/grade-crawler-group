chrome.runtime.onMessage.addListener(function(group, sender, sendResponse) {
    var id = setInterval(function() {
        var members = $('div.members');
        if (members.length) {
            members = members.map(function() {
                var member = $(this);
                return {
                    name: member.find('.member_name').text(),
                    id: member.find('.member_id').text()
                };
            }).toArray();
            group.members = members;
            chrome.runtime.sendMessage(group);
            clearInterval(id);
        }
    }, 100);
});

