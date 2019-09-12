var cheerio = require('cheerio');
var superagent = require('superagent');
var url = require('url');

/**
 * @params list {Array} - 要迭代的数组
 * @params limit {Number} - 并发数量控制数
 * @params asyncHandle {Function} - 对`list`的每一个项的处理函数，参数为当前处理项，必须 return 一个Promise来确定是否继续进行迭代
 * @return {Promise} - 返回一个 Promise 值来确认所有数据是否迭代完成
 */
let mapLimit = (list, limit, asyncHandle) => {
    //定义一个递归函数，相当于从list队列中取任务
    function recursion(taskQueue, threadId) {
        return asyncHandle(taskQueue.shift(), threadId) //每次取队首任务，并从队列里去掉
            .then(() => {//上一个任务resolve后，继续取下一个任务
                if (taskQueue.length !== 0) //任务队列非空，递归继续进行迭代
                    return recursion(taskQueue, threadId);
                else
                    return 'finish';//任务队列清空，返回
            })
    };

    let tempList = [].concat(list);//保存一份副本，避免原本被更改
    limit = (limit < tempList.length) ? limit : tempList.length;//若异步池大小比任务数还大，则缩小异步池
    let asyncPool = []; // 正在进行的所有并发异步操作（异步池）
    let threadId = 0;
    while (limit--) {//往异步池里添加limit个任务，相当于limit个“线程”同时在跑，之后每条任务线再递归地从队列里取下一个任务，和线程池不太一样。
        asyncPool.push(recursion(tempList, threadId++));
    }
    return Promise.all(asyncPool);  // limite个并发异步操作都完成后，返回。
}


let urlList = [];
let cnt = 10;
let domain = 'https://cnodejs.org/';
for (let i = 1; i <= cnt; i++) {
    urlList.push(domain + '?tab=all&page=' + i);
}
//异步处理函数
function crwalFunc(url, threadId) {
    console.log('In thread ' + threadId + '>>>, fetch ' + url + ' begin');
    return new Promise((resolve, reject) => {
        superagent.get(url).end(
            function (err, res) {
                console.log('In thread ' + threadId + '###, fetch ' + url + ' successful');
                //topics.push([url, res.text]);
                resolve();
            }
        );
    });
}
mapLimit(urlList, 5, crwalFunc).then(() => {
    console.log('Done!');
});
