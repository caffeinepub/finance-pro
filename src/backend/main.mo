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
    loanFee : Float;
    loanType : Text;
    lineCategoryId : Text;
    isActive : Bool;
    createdAt : Text;
    createdBy : Text;
    // NOTE: loanDate is stored in customerTimestampsMap (as a separate stable variable)
    // to avoid changing this type and causing data wipes on upgrade.
  };

  // IMPORTANT: Do NOT add new required fields to this type — it will break stable
  // variable deserialization on upgrade. Payment method data is stored separately
  // in emiPaymentMetaMap to avoid changing this type.
  type EMIPayment = {
    id : Text;
    customerId : Text;
    amount : Float;
    paymentDate : Text;
    createdAt : Text;
    recordedBy : Text;
  };

  // Payment method metadata stored separately to avoid EMIPayment type changes.
  // paymentMethod: "cash" | "account" | "split"
  // cashAmount and transferAmount only set when paymentMethod = "split"
  type EMIPaymentMeta = {
    paymentMethod : Text;
    cashAmount : Float;
    transferAmount : Float;
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

  // Customer media: photo URL + ID proof URLs stored separately to avoid Customer type changes.
  type CustomerMedia = {
    photoUrl : Text;
    idProofUrls : [Text];
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
  stable var stableCustomerTimestamps : [(Text, Text)] = [];
  // Locked lines stored separately to avoid type changes on existing records.
  stable var stableLockedLines : [Text] = [];
  // Customer media (photo + ID proof URLs) stored separately.
  stable var stableCustomerMedia : [(Text, CustomerMedia)] = [];
  // EMI payment method metadata stored separately to avoid EMIPayment type changes.
  stable var stableEMIPaymentMeta : [(Text, EMIPaymentMeta)] = [];

  // In-memory working maps
  var customersMap : Map.Map<Text, Customer> = Map.empty();
  var emiPaymentsMap : Map.Map<Text, EMIPayment> = Map.empty();
  var lineCategoriesMap : Map.Map<Text, LineCategory> = Map.empty();
  var agentAccountsMap : Map.Map<Text, AgentAccount> = Map.empty();
  var savedReportsMap : Map.Map<Text, SavedReport> = Map.empty();
  var customerTimestampsMap : Map.Map<Text, Text> = Map.empty();
  var lockedLinesSet : [Text] = [];
  var customerMediaMap : Map.Map<Text, CustomerMedia> = Map.empty();
  var emiPaymentMetaMap : Map.Map<Text, EMIPaymentMeta> = Map.empty();

  // Reconstruct maps from stable arrays on first init
  do {
    for ((k, v) in stableCustomers.vals()) { customersMap.add(k, v) };
    for ((k, v) in stableEMIPayments.vals()) { emiPaymentsMap.add(k, v) };
    for ((k, v) in stableLineCategories.vals()) { lineCategoriesMap.add(k, v) };
    for ((k, v) in stableAgentAccounts.vals()) { agentAccountsMap.add(k, v) };
    for ((k, v) in stableSavedReports.vals()) { savedReportsMap.add(k, v) };
    for ((k, v) in stableCustomerTimestamps.vals()) { customerTimestampsMap.add(k, v) };
    lockedLinesSet := stableLockedLines;
    for ((k, v) in stableCustomerMedia.vals()) { customerMediaMap.add(k, v) };
    for ((k, v) in stableEMIPaymentMeta.vals()) { emiPaymentMetaMap.add(k, v) };
  };

  system func preupgrade() {
    stableCustomers := customersMap.entries().toArray();
    stableEMIPayments := emiPaymentsMap.entries().toArray();
    stableLineCategories := lineCategoriesMap.entries().toArray();
    stableAgentAccounts := agentAccountsMap.entries().toArray();
    stableSavedReports := savedReportsMap.entries().toArray();
    stableCustomerTimestamps := customerTimestampsMap.entries().toArray();
    stableLockedLines := lockedLinesSet;
    stableCustomerMedia := customerMediaMap.entries().toArray();
    stableEMIPaymentMeta := emiPaymentMetaMap.entries().toArray();
  };

  system func postupgrade() {
    customersMap := Map.empty();
    emiPaymentsMap := Map.empty();
    lineCategoriesMap := Map.empty();
    agentAccountsMap := Map.empty();
    savedReportsMap := Map.empty();
    customerTimestampsMap := Map.empty();
    customerMediaMap := Map.empty();
    emiPaymentMetaMap := Map.empty();
    for ((k, v) in stableCustomers.vals()) { customersMap.add(k, v) };
    for ((k, v) in stableEMIPayments.vals()) { emiPaymentsMap.add(k, v) };
    for ((k, v) in stableLineCategories.vals()) { lineCategoriesMap.add(k, v) };
    for ((k, v) in stableAgentAccounts.vals()) { agentAccountsMap.add(k, v) };
    for ((k, v) in stableSavedReports.vals()) { savedReportsMap.add(k, v) };
    for ((k, v) in stableCustomerTimestamps.vals()) { customerTimestampsMap.add(k, v) };
    lockedLinesSet := stableLockedLines;
    for ((k, v) in stableCustomerMedia.vals()) { customerMediaMap.add(k, v) };
    for ((k, v) in stableEMIPaymentMeta.vals()) { emiPaymentMetaMap.add(k, v) };
    // NOTE: stable arrays are intentionally NOT cleared here.
  };

  // Customer Management — individual add/update
  public shared func addOrUpdateCustomer(customer : Customer) : async () {
    customersMap.add(customer.id, customer);
  };

  public shared func deleteCustomer(id : Text) : async () {
    customersMap.remove(id);
    customerMediaMap.remove(id);
  };

  public query func getCustomers() : async [Customer] {
    customersMap.values().toArray();
  };

  // Bulk replace customers
  public shared func setCustomers(customers : [Customer]) : async () {
    customersMap := Map.empty();
    for (customer in customers.vals()) {
      customersMap.add(customer.id, customer);
    };
  };

  // EMI Payment Management — individual add/update
  public shared func addOrUpdateEMIPayment(payment : EMIPayment) : async () {
    emiPaymentsMap.add(payment.id, payment);
  };

  public shared func deleteEMIPayment(id : Text) : async () {
    emiPaymentsMap.remove(id);
    emiPaymentMetaMap.remove(id);
  };

  public query func getEMIPayments() : async [EMIPayment] {
    emiPaymentsMap.values().toArray();
  };

  // Bulk replace EMI payments
  public shared func setEMIPayments(payments : [EMIPayment]) : async () {
    emiPaymentsMap := Map.empty();
    for (payment in payments.vals()) {
      emiPaymentsMap.add(payment.id, payment);
    };
  };

  // EMI Payment Meta Management — store payment method per EMI
  public shared func setEMIPaymentMeta(emiId : Text, meta : EMIPaymentMeta) : async () {
    emiPaymentMetaMap.add(emiId, meta);
  };

  public shared func setEMIPaymentMetaBulk(entries : [(Text, EMIPaymentMeta)]) : async () {
    emiPaymentMetaMap := Map.empty();
    for ((k, v) in entries.vals()) {
      emiPaymentMetaMap.add(k, v);
    };
  };

  public query func getEMIPaymentMeta() : async [(Text, EMIPaymentMeta)] {
    emiPaymentMetaMap.entries().toArray();
  };

  public shared func deleteEMIPaymentMeta(emiId : Text) : async () {
    emiPaymentMetaMap.remove(emiId);
  };

  // Customer Timestamps — bulk replace
  public shared func setCustomerTimestamps(entries : [(Text, Text)]) : async () {
    customerTimestampsMap := Map.empty();
    for ((k, v) in entries.vals()) {
      customerTimestampsMap.add(k, v);
    };
  };

  public query func getCustomerTimestamps() : async [(Text, Text)] {
    customerTimestampsMap.entries().toArray();
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

  // Locked Lines Management — bulk replace
  public shared func setLockedLines(lines : [Text]) : async () {
    lockedLinesSet := lines;
    stableLockedLines := lines;
  };

  public query func getLockedLines() : async [Text] {
    lockedLinesSet;
  };

  // Customer Media Management — store photo and ID proof URLs per customer
  public shared func setCustomerMedia(customerId : Text, media : CustomerMedia) : async () {
    customerMediaMap.add(customerId, media);
  };

  public query func getCustomerMedia() : async [(Text, CustomerMedia)] {
    customerMediaMap.entries().toArray();
  };

  public shared func deleteCustomerMedia(customerId : Text) : async () {
    customerMediaMap.remove(customerId);
  };
};
