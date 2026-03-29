import Map "mo:core/Map";
import Text "mo:core/Text";
import AccessControl "./authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";

actor {
  type Customer = {
    id : Text;
    serialNumber : Text;
    name : Text;
    phone : Text;
    address : Text;
    loanAmount : Float;
    loanInterest : Float;
    loanType : Text;
    loanFee : Float;
    lineCategoryId : Text;
    createdAt : Text;
    createdBy : Text;
    isActive : Bool;
    // NOTE: Do NOT add fields here — changing this type breaks stable variable
    // deserialization on upgrade and wipes all customer data.
    // Store extra per-customer metadata in separate stable maps instead.
  };

  type EMIPayment = {
    id : Text;
    customerId : Text;
    amount : Float;
    paymentDate : Text;
    recordedBy : Text;
    createdAt : Text;
  };

  type LineCategory = {
    id : Text;
    name : Text;
  };

  // IMPORTANT: Never add required fields to this type — it will break stable
  // variable deserialization on upgrade and wipe all agent data.
  // To add new agent properties, encode them as special markers inside
  // assignedLines (e.g. "__dash_on__") and decode them in the frontend.
  type AgentAccount = {
    id : Text;
    username : Text;
    password : Text;
    assignedLines : [Text];
  };

  type SavedReport = {
    id : Text;
    reportDate : Text;
    lineName : Text;
    preAmount : Float;
    collection : Float;
    loanFee : Float;
    lending : Float;
    expense : Float;
    dynLeftJson : Text;
    dynRightJson : Text;
    leftTotal : Float;
    rightTotal : Float;
    reminder : Float;
    savedAt : Text;
    savedBy : Text;
  };

  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // Stable storage — survives canister upgrades
  stable var stableCustomers : [(Text, Customer)] = [];
  stable var stableEMIPayments : [(Text, EMIPayment)] = [];
  stable var stableLineCategories : [(Text, LineCategory)] = [];
  stable var stableAgentAccounts : [(Text, AgentAccount)] = [];
  stable var stableSavedReports : [(Text, SavedReport)] = [];
  // Separate map for customer addedAt timestamps (customerId -> ISO string).
  // Stored separately to avoid changing the Customer type (which would break
  // stable variable compatibility and wipe all data on upgrade).
  stable var stableCustomerTimestamps : [(Text, Text)] = [];

  // In-memory working maps
  var customersMap : Map.Map<Text, Customer> = Map.empty();
  var emiPaymentsMap : Map.Map<Text, EMIPayment> = Map.empty();
  var lineCategoriesMap : Map.Map<Text, LineCategory> = Map.empty();
  var agentAccountsMap : Map.Map<Text, AgentAccount> = Map.empty();
  var savedReportsMap : Map.Map<Text, SavedReport> = Map.empty();
  var customerTimestampsMap : Map.Map<Text, Text> = Map.empty();

  // Reconstruct maps from stable arrays on first init
  do {
    for ((k, v) in stableCustomers.vals()) { customersMap.add(k, v) };
    for ((k, v) in stableEMIPayments.vals()) { emiPaymentsMap.add(k, v) };
    for ((k, v) in stableLineCategories.vals()) { lineCategoriesMap.add(k, v) };
    for ((k, v) in stableAgentAccounts.vals()) { agentAccountsMap.add(k, v) };
    for ((k, v) in stableSavedReports.vals()) { savedReportsMap.add(k, v) };
    for ((k, v) in stableCustomerTimestamps.vals()) { customerTimestampsMap.add(k, v) };
  };

  system func preupgrade() {
    stableCustomers := customersMap.entries().toArray();
    stableEMIPayments := emiPaymentsMap.entries().toArray();
    stableLineCategories := lineCategoriesMap.entries().toArray();
    stableAgentAccounts := agentAccountsMap.entries().toArray();
    stableSavedReports := savedReportsMap.entries().toArray();
    stableCustomerTimestamps := customerTimestampsMap.entries().toArray();
  };

  system func postupgrade() {
    customersMap := Map.empty();
    emiPaymentsMap := Map.empty();
    lineCategoriesMap := Map.empty();
    agentAccountsMap := Map.empty();
    savedReportsMap := Map.empty();
    customerTimestampsMap := Map.empty();
    for ((k, v) in stableCustomers.vals()) { customersMap.add(k, v) };
    for ((k, v) in stableEMIPayments.vals()) { emiPaymentsMap.add(k, v) };
    for ((k, v) in stableLineCategories.vals()) { lineCategoriesMap.add(k, v) };
    for ((k, v) in stableAgentAccounts.vals()) { agentAccountsMap.add(k, v) };
    for ((k, v) in stableSavedReports.vals()) { savedReportsMap.add(k, v) };
    for ((k, v) in stableCustomerTimestamps.vals()) { customerTimestampsMap.add(k, v) };
    // NOTE: stable arrays are intentionally NOT cleared here.
    // Keeping them ensures data can be recovered on future upgrades
    // even if the in-memory restore partially fails.
  };

  // Customer Management — individual add/update
  public shared func addOrUpdateCustomer(customer : Customer) : async () {
    customersMap.add(customer.id, customer);
  };

  // Customer Management — bulk replace
  public shared func setCustomers(customers : [Customer]) : async () {
    customersMap := Map.empty();
    for (customer in customers.vals()) {
      customersMap.add(customer.id, customer);
    };
  };

  public query func getCustomers() : async [Customer] {
    customersMap.values().toArray();
  };

  public shared func deleteCustomer(id : Text) : async () {
    customersMap.remove(id);
    customerTimestampsMap.remove(id);
    let toRemove = Map.empty<Text, Bool>();
    for ((pid, p) in emiPaymentsMap.entries()) {
      if (Text.equal(p.customerId, id)) {
        toRemove.add(pid, true);
      };
    };
    for (pid in toRemove.keys()) {
      emiPaymentsMap.remove(pid);
    };
  };

  // Customer Timestamps — separate map for addedAt ISO strings
  public shared func setCustomerTimestamps(entries : [(Text, Text)]) : async () {
    customerTimestampsMap := Map.empty();
    for ((k, v) in entries.vals()) {
      customerTimestampsMap.add(k, v);
    };
  };

  public query func getCustomerTimestamps() : async [(Text, Text)] {
    customerTimestampsMap.entries().toArray();
  };

  // EMI Payments Management — individual add/update
  public shared func addOrUpdateEMIPayment(payment : EMIPayment) : async () {
    emiPaymentsMap.add(payment.id, payment);
  };

  // EMI Payments Management — bulk replace
  public shared func setEMIPayments(payments : [EMIPayment]) : async () {
    emiPaymentsMap := Map.empty();
    for (payment in payments.vals()) {
      emiPaymentsMap.add(payment.id, payment);
    };
  };

  public query func getEMIPayments() : async [EMIPayment] {
    emiPaymentsMap.values().toArray();
  };

  public shared func deleteEMIPayment(paymentId : Text) : async () {
    emiPaymentsMap.remove(paymentId);
  };

  // Line Categories Management — bulk replace
  public shared func setLineCategories(categories : [LineCategory]) : async () {
    lineCategoriesMap := Map.empty();
    for (category in categories.vals()) {
      lineCategoriesMap.add(category.id, category);
    };
  };

  public query func getLineCategories() : async [LineCategory] {
    lineCategoriesMap.values().toArray();
  };

  // Agent Accounts Management — bulk replace
  // NOTE: Extra agent properties (e.g. dashboard access) are encoded as
  // special marker strings inside assignedLines (e.g. "__dash_on__") and
  // decoded by the frontend. This avoids any record type changes that would
  // break stable variable compatibility on canister upgrade.
  public shared func setAgentAccounts(agents : [AgentAccount]) : async () {
    agentAccountsMap := Map.empty();
    for (agent in agents.vals()) {
      agentAccountsMap.add(agent.id, agent);
    };
  };

  public query func getAgentAccounts() : async [AgentAccount] {
    agentAccountsMap.values().toArray();
  };

  // Saved Reports Management — bulk replace
  public shared func setSavedReports(reports : [SavedReport]) : async () {
    savedReportsMap := Map.empty();
    for (report in reports.vals()) {
      let key = report.lineName # ":" # report.reportDate;
      savedReportsMap.add(key, report);
    };
  };

  // Saved Reports Management — individual add/update
  public shared func addOrUpdateSavedReport(report : SavedReport) : async () {
    let key = report.lineName # ":" # report.reportDate;
    savedReportsMap.add(key, report);
  };

  public query func getSavedReports() : async [SavedReport] {
    savedReportsMap.values().toArray();
  };

  public shared func deleteSavedReport(id : Text) : async () {
    savedReportsMap.remove(id);
  };
};
