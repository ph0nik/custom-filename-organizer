class Node {
    constructor(value) {
        this.value = value;
        this.next = undefined;
    }
}

class FileQueue {

    constructor() {
        this.first = undefined;
        this.last = undefined;
    }

    dequeue() {
        if (this.hasNext()) {
            let temp = this.first;
            this.first = this.first.next;
            return temp.value;
        }
    }

    enqueue(item) {
        let temp = this.last;
        this.last = new Node(item);
        if (this.first === undefined) {
            this.first = this.last;
        } else if (this.first === this.last) {
            this.first = temp;
            this.first.next = this.last;
        } else {
            temp.next = this.last;
        }
    }

    hasNext() {
        return !(this.first === undefined);
    }
}

function test() {
    const q = new FileQueue();
    q.enqueue('a');
    q.enqueue('b');
    q.enqueue('c');
    q.enqueue('d');
    q.enqueue('e');

    setInterval(function () {
        if (q.hasNext()) {
            console.log(q.dequeue());
        } else {
            clearInterval(this);
        }
    }, 1000);


}


module.exports = { FileQueue }
