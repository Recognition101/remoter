(function(ElementPrototype) {
    if (!ElementPrototype) {return;}

    var matchesSelector = function (selector) {
        var i = 0;
        var root = this.parentNode || this.document;
        var nodes = root.querySelectorAll(selector);
        while (nodes[i] && nodes[i] !== this) {i += 1;}
        return !!nodes[i];
    };

    ElementPrototype.matchesSelector =ElementPrototype.matchesSelector ||
                                      ElementPrototype.mozMatchesSelector ||
                                      ElementPrototype.msMatchesSelector ||
                                      ElementPrototype.oMatchesSelector ||
                                      ElementPrototype.webkitMatchesSelector ||
                                      matchesSelector;
})(this.Element && Element.prototype);

document.addEventListener('click', function(e) {
    if (e.target.matchesSelector('.buttons a')) {
        e.preventDefault();

        var req = new XMLHttpRequest();
        req.onreadystatechange = function(){
            if (req.readyState === 4 && req.status === 200) {
                var tbl = document.getElementById('history-table');
                tbl.innerHTML = req.responseText;
            }
        };

        req.open('GET', e.target.href + '?history');
        req.send();
    }
});
