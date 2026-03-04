const taskInput = document.getElementById("taskInput");
const addTaskButton = document.getElementById("addTaskButton");
const selectAllCheckbox = document.getElementById("selectAllCheckbox");
const deleteCompletedButton = document.getElementById("deleteCompletedButton");
const tabs = document.getElementById("tabs");
const taskList = document.getElementById("taskList");
const pagination = document.getElementById("pagination");
const countAll = document.getElementById("countAll");
const countActive = document.getElementById("countActive");
const countCompleted = document.getElementById("countCompleted");

let currentFilter = "all";
let currentPage = 1;
const pageLimit = 5;
let visibleTasks = [];
let totalCountForCurrentFilter = 0;

// Функция для обновления счетчиков задач
async function refreshCounters() {
    const allResponse = await fetch("/tasks/count?filter=all");
    const activeResponse = await fetch("/tasks/count?filter=active");
    const completedResponse = await fetch("/tasks/count?filter=completed");

    const allData = await allResponse.json();
    const activeData = await activeResponse.json();
    const completedData = await completedResponse.json();

    countAll.innerHTML = allData.count;
    countActive.innerHTML = activeData.count;
    countCompleted.innerHTML = completedData.count;
}

// Загрузка задач и их подсчет
async function loadTasks() {
    const countResponse = await fetch("/tasks/count?filter=" + currentFilter);
    const countData = await countResponse.json();
    totalCountForCurrentFilter = countData.count;

    const tasksResponse = await fetch("/tasks?filter=" + currentFilter + "&page=" + currentPage + "&limit=" + pageLimit);
    const tasksData = await tasksResponse.json();
    visibleTasks = tasksData;
}

// Построение пагинации
function renderPagination() {
    pagination.innerHTML = "";
    const totalPages = Math.ceil(totalCountForCurrentFilter / pageLimit);

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
        const pageButton = document.createElement("button");
        pageButton.className = "pageButton" + (pageNumber === currentPage ? " activePage" : "");
        pageButton.innerHTML = pageNumber;
        pageButton.onclick = async () => {
            currentPage = pageNumber;
            await refreshScreen();
        };
        pagination.appendChild(pageButton);
    }
}

// Обновление состояния "Выделить все"
async function updateSelectAllState() {
    const allTasksResponse = await fetch("/tasks?filter=all&page=1&limit=1000000");
    const allTasksData = await allTasksResponse.json();
    if (allTasksData.length === 0) {
        selectAllCheckbox.checked = false;
        return;
    }
    const allCompleted = allTasksData.every((taskItem) => taskItem.completed === true);
    selectAllCheckbox.checked = allCompleted;
}

// Рендеринг задач
function renderTasks() {
    taskList.innerHTML = "";

    visibleTasks.forEach((taskItem) => {
        const listItem = document.createElement("li");
        listItem.className = "taskItem";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = taskItem.completed === true;
        checkbox.onchange = async () => {
            await fetch("/tasks/" + taskItem.id, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ completed: checkbox.checked })
            });
            await refreshScreen();
        };

        const taskText = document.createElement("span");
        // Защита от XSS: textContent вместо innerHTML.
        taskText.className = "taskText" + (taskItem.completed ? " completedText" : "");
        taskText.textContent = taskItem.text;

        taskText.onclick = () => {
            const oldValue = taskItem.text;
            const editInput = document.createElement("input");
            editInput.type = "text";
            editInput.value = oldValue;
            editInput.maxLength = 250;
            editInput.className = "editInput";

            const saveEdit = async () => {
                await fetch("/tasks/" + taskItem.id, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: editInput.value })
                });
                await refreshScreen();
            };

            // Обработка клавиш Enter и Escape для редактирования
            editInput.addEventListener("keydown", async (event) => {
                if (event.key === "Escape") {
                    await refreshScreen(); // Отменяет редактирование
                }
                if (event.key === "Enter") {
                    await saveEdit(); // Сохраняет изменения
                }
            });

            // При потере фокуса также сохраняем изменения
            editInput.addEventListener("blur", async () => {
                await saveEdit();
            });

            taskText.replaceWith(editInput);
            editInput.focus();
            // Устанавливаем курсор в конец текста
            editInput.setSelectionRange(editInput.value.length, editInput.value.length);
        };

        const deleteButton = document.createElement("button");
        deleteButton.className = "deleteTaskButton";
        deleteButton.innerHTML = "Удалить";
        deleteButton.onclick = async () => {
            await fetch("/tasks/" + taskItem.id, { method: "DELETE" });
            const maxPage = Math.max(1, Math.ceil((totalCountForCurrentFilter - 1) / pageLimit));
            if (currentPage > maxPage) {
                currentPage = maxPage;
            }
            await refreshScreen();
        };

        listItem.appendChild(checkbox);
        listItem.appendChild(taskText);
        listItem.appendChild(deleteButton);
        taskList.appendChild(listItem);
    });
}

// Обновление активной вкладки
function updateTabsView() {
    const tabButtons = tabs.querySelectorAll(".tabButton");
    tabButtons.forEach((tabButton) => {
        if (tabButton.dataset.filter === currentFilter) {
            tabButton.classList.add("activeTab");
        } else {
            tabButton.classList.remove("activeTab");
        }
    });
}

// Обновление интерфейса
async function refreshScreen(needFocusInput = false) {
    await loadTasks();
    await refreshCounters();
    renderTasks();
    renderPagination();
    updateTabsView();
    await updateSelectAllState();
    if (needFocusInput) {
        taskInput.focus();
    }
}

// Добавление новой задачи
async function addTask() {
    await fetch("/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: taskInput.value, completed: false })
    });

    taskInput.value = "";
    currentFilter = "all";
    currentPage = 1;
    await refreshScreen(true);
}

// Обработчики событий
addTaskButton.onclick = async () => {
    await addTask();
};

taskInput.addEventListener("keydown", async (event) => {
    if (event.key === "Enter") {
        await addTask();
    }
    if (event.key === "Escape") {
        taskInput.value = "";
    }
});

deleteCompletedButton.onclick = async () => {
    await fetch("/tasks/completed", { method: "DELETE" });
    currentPage = 1;
    await refreshScreen();
};

selectAllCheckbox.onchange = async () => {
    await fetch("/tasks/select-all", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: selectAllCheckbox.checked })
    });
    await refreshScreen();
};

tabs.addEventListener("click", async (event) => {
    const clickedButton = event.target.closest(".tabButton");
    if (!clickedButton) {
        return;
    }
    currentFilter = clickedButton.dataset.filter;
    currentPage = 1;
    await refreshScreen();
});

// Стартовое обновление интерфейса
refreshScreen();